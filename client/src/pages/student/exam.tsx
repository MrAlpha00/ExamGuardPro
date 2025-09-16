import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import WebcamMonitor from "@/components/webcam-monitor";
import FaceDetection from "@/components/face-detection";
import { useWebcam } from "@/hooks/useWebcam";
import { useFaceDetection } from "@/hooks/useFaceDetection";
import { useWebSocket } from "@/hooks/useWebSocket";

interface HallTicketData {
  id: string;
  examName: string;
  studentName: string;
  rollNumber: string;
  examDate: string;
  duration: number;
}

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  questionType: string;
}

export default function ExamMode() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hallTicketData, setHallTicketData] = useState<HallTicketData | null>(null);
  const [examSession, setExamSession] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [warningCount, setWarningCount] = useState(0);
  
  const { isActive: cameraActive, startCamera } = useWebcam();
  const { faceDetected, multipleFaces, lookingAway, confidence } = useFaceDetection();
  const { sendMessage } = useWebSocket();

  // Sample questions (in a real app, these would come from the API)
  const questions: Question[] = [
    {
      id: "1",
      questionText: "What is the time complexity of searching for an element in a balanced binary search tree?",
      options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
      correctAnswer: "B",
      questionType: "multiple_choice"
    },
    {
      id: "2", 
      questionText: "Which of the following is NOT a principle of object-oriented programming?",
      options: ["Encapsulation", "Inheritance", "Polymorphism", "Compilation"],
      correctAnswer: "D",
      questionType: "multiple_choice"
    },
    // Add more questions as needed
  ];

  // Initialize exam session
  const createSessionMutation = useMutation({
    mutationFn: async (hallTicketId: string) => {
      const response = await apiRequest("POST", "/api/exam-sessions", {
        hallTicketId,
        status: "in_progress",
        startTime: new Date().toISOString(),
        currentQuestion: 1,
        answers: {},
        timeRemaining: hallTicketData?.duration ? hallTicketData.duration * 60 : 10800, // Convert minutes to seconds
      });
      return response.json();
    },
    onSuccess: (session) => {
      setExamSession(session);
      setTimeRemaining(session.timeRemaining);
      enterFullscreen();
      startCamera();
    },
    onError: (error) => {
      toast({
        title: "Session Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Enter fullscreen mode
  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  };

  // Exit fullscreen mode
  const exitFullscreen = async () => {
    try {
      await document.exitFullscreen();
      setIsFullscreen(false);
    } catch (error) {
      console.error("Exit fullscreen error:", error);
    }
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      // If user exits fullscreen, show warning
      if (!document.fullscreenElement && examSession) {
        setShowWarning(true);
        setWarningCount(prev => prev + 1);
        
        // Create security incident
        createSecurityIncident({
          sessionId: examSession.id,
          incidentType: "fullscreen_exit",
          severity: "medium",
          description: "Student exited fullscreen mode",
          metadata: { warningCount: warningCount + 1 }
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [examSession, warningCount]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining > 0 && examSession) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto-submit exam
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [timeRemaining, examSession]);

  // Monitor face detection
  useEffect(() => {
    if (!examSession || !cameraActive) return;

    if (multipleFaces) {
      setShowWarning(true);
      createSecurityIncident({
        sessionId: examSession.id,
        incidentType: "multiple_faces",
        severity: "critical",
        description: "Multiple faces detected",
        metadata: { confidence, faceCount: 2 }
      });
    } else if (lookingAway) {
      setShowWarning(true);
      createSecurityIncident({
        sessionId: examSession.id,
        incidentType: "looking_away",
        severity: "medium",
        description: "Student looking away from camera",
        metadata: { duration: 5, confidence }
      });
    }
  }, [multipleFaces, lookingAway, examSession, cameraActive]);

  // Create security incident
  const createSecurityIncident = async (incident: any) => {
    try {
      await apiRequest("POST", "/api/security-incidents", incident);
      
      // Send WebSocket message to admin
      sendMessage({
        type: 'security_incident',
        data: {
          studentId: user?.id,
          studentName: hallTicketData?.studentName,
          rollNumber: hallTicketData?.rollNumber,
          ...incident
        }
      });
    } catch (error) {
      console.error("Failed to create security incident:", error);
    }
  };

  // Load hall ticket data on mount
  useEffect(() => {
    const storedData = localStorage.getItem("hallTicketData");
    const verificationComplete = localStorage.getItem("verificationComplete");
    
    if (!storedData || !verificationComplete) {
      toast({
        title: "Authentication Required",
        description: "Please complete authentication and verification first",
        variant: "destructive",
      });
      setLocation("/student/auth");
      return;
    }
    
    try {
      const data = JSON.parse(storedData);
      setHallTicketData(data);
      createSessionMutation.mutate(data.id);
    } catch (error) {
      toast({
        title: "Invalid Data",
        description: "Please complete authentication again",
        variant: "destructive",
      });
      setLocation("/student/auth");
    }
  }, []);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionIndex: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: answer }));
  };

  const navigateQuestion = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentQuestion > 1) {
      setCurrentQuestion(prev => prev - 1);
    } else if (direction === 'next' && currentQuestion < questions.length) {
      setCurrentQuestion(prev => prev + 1);
    }
  };

  const submitExam = async () => {
    if (!examSession) return;
    
    try {
      await apiRequest("PATCH", `/api/exam-sessions/${examSession.id}`, {
        status: "completed",
        endTime: new Date().toISOString(),
        answers,
        timeRemaining
      });
      
      toast({
        title: "Exam Submitted",
        description: "Your exam has been submitted successfully",
      });
      
      // Exit fullscreen and clean up
      await exitFullscreen();
      localStorage.removeItem("hallTicketData");
      localStorage.removeItem("verificationComplete");
      setLocation("/");
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!hallTicketData || !examSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing exam session...</p>
        </div>
      </div>
    );
  }

  const currentQuestionData = questions[currentQuestion - 1];

  return (
    <div className="kiosk-mode bg-background">
      {/* Exam Header */}
      <div className="bg-gradient-primary text-white p-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <i className="fas fa-graduation-cap text-2xl"></i>
          <div>
            <h1 className="font-bold text-lg">{hallTicketData.examName}</h1>
            <p className="text-sm opacity-90">
              {hallTicketData.hallTicketId || hallTicketData.id} - {hallTicketData.studentName} ({hallTicketData.rollNumber})
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-6">
          {/* Timer */}
          <div className="text-center">
            <div className="text-3xl font-mono font-bold">{formatTime(timeRemaining)}</div>
            <div className="text-xs opacity-75">Time Remaining</div>
          </div>
          
          {/* Status Indicators */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className={`status-indicator ${faceDetected ? 'status-online pulse-green' : 'status-warning'}`}></div>
              <span className="text-xs">Camera</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="status-indicator status-online"></div>
              <span className="text-xs">Network</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Question Panel */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {/* Question Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <span className="bg-primary text-primary-foreground px-4 py-2 rounded-full font-semibold">
                  Question {currentQuestion} of {questions.length}
                </span>
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                  Multiple Choice
                </span>
              </div>
              <div className="flex space-x-2">
                <button className="bg-yellow-100 text-yellow-800 p-2 rounded-lg hover:bg-yellow-200">
                  <i className="fas fa-flag"></i>
                </button>
              </div>
            </div>

            {/* Question Content */}
            <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                {currentQuestionData.questionText}
              </h2>
              
              <div className="space-y-4 mt-6">
                {currentQuestionData.options.map((option, index) => {
                  const optionLetter = String.fromCharCode(65 + index); // A, B, C, D
                  const isSelected = answers[currentQuestion] === optionLetter;
                  
                  return (
                    <label 
                      key={index}
                      className={`flex items-center p-4 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 border-2 border-primary' 
                          : 'bg-muted hover:bg-border'
                      }`}
                    >
                      <input 
                        type="radio" 
                        name="answer" 
                        value={optionLetter}
                        checked={isSelected}
                        onChange={(e) => handleAnswerChange(currentQuestion, e.target.value)}
                        className="mr-4 w-5 h-5 accent-primary"
                        data-testid={`option-${optionLetter}`}
                      />
                      <div>
                        <span className="font-medium text-primary mr-3">{optionLetter})</span>
                        <span>{option}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="outline"
                onClick={() => navigateQuestion('prev')}
                disabled={currentQuestion === 1}
                data-testid="button-previous"
              >
                <i className="fas fa-chevron-left mr-2"></i>Previous
              </Button>
              
              <div className="flex space-x-4">
                <Button
                  variant="outline"
                  className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  data-testid="button-bookmark"
                >
                  <i className="fas fa-bookmark mr-2"></i>Save & Mark
                </Button>
                {currentQuestion < questions.length ? (
                  <Button
                    onClick={() => navigateQuestion('next')}
                    data-testid="button-next"
                  >
                    Next<i className="fas fa-chevron-right ml-2"></i>
                  </Button>
                ) : (
                  <Button
                    onClick={submitExam}
                    variant="destructive"
                    data-testid="button-submit"
                  >
                    <i className="fas fa-paper-plane mr-2"></i>Submit Exam
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Question Navigation Panel */}
        <div className="w-80 bg-card border-l border-border p-6">
          <div className="mb-6">
            <h3 className="font-semibold text-foreground mb-4">Question Navigator</h3>
            
            {/* Legend */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-primary rounded"></div>
                <span>Current</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-yellow-500 rounded"></div>
                <span>Marked</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-6 h-6 bg-muted border-2 border-border rounded"></div>
                <span>Not Visited</span>
              </div>
            </div>
            
            {/* Question Grid */}
            <div className="grid grid-cols-5 gap-2">
              {questions.map((_, index) => {
                const questionNum = index + 1;
                const isAnswered = answers[questionNum];
                const isCurrent = currentQuestion === questionNum;
                
                return (
                  <button
                    key={index}
                    className={`w-10 h-10 rounded font-medium hover:opacity-80 transition-opacity ${
                      isCurrent 
                        ? 'bg-primary text-white' 
                        : isAnswered 
                          ? 'bg-green-500 text-white'
                          : 'bg-muted border-2 border-border hover:bg-border'
                    }`}
                    onClick={() => setCurrentQuestion(questionNum)}
                    data-testid={`question-nav-${questionNum}`}
                  >
                    {questionNum}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exam Summary */}
          <div className="bg-muted rounded-lg p-4 mb-6">
            <h4 className="font-semibold mb-3">Progress Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Answered:</span>
                <span className="font-medium text-green-600">
                  {Object.keys(answers).length}/{questions.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Marked:</span>
                <span className="font-medium text-yellow-600">0/{questions.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Not Visited:</span>
                <span className="font-medium text-muted-foreground">
                  {questions.length - Math.max(...Object.keys(answers).map(Number), 0)}/{questions.length}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Section */}
          <div className="border-t border-border pt-4">
            <Button
              onClick={submitExam}
              variant="destructive"
              className="w-full"
              data-testid="button-final-submit"
            >
              <i className="fas fa-paper-plane mr-2"></i>Submit Exam
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Auto-submit in {formatTime(timeRemaining)}
            </p>
          </div>
        </div>
      </div>

      {/* Live Camera Feed (Floating) */}
      <div className="fixed top-20 right-6 w-64 h-48 bg-black rounded-lg overflow-hidden shadow-xl border-2 border-primary z-10">
        <WebcamMonitor />
        <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs">
          ● REC
        </div>
        <div className={`absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs ${
          faceDetected ? 'pulse-green' : ''
        }`}>
          Face: {faceDetected ? '✓' : '✗'}
        </div>
      </div>

      {/* Warning Banner */}
      {showWarning && (
        <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground p-4 text-center font-semibold z-20">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          WARNING: {multipleFaces ? 'Multiple faces detected' : lookingAway ? 'Looking away detected' : 'Please face the camera'}.
          <Button
            variant="secondary"
            size="sm"
            className="ml-4"
            onClick={() => setShowWarning(false)}
          >
            Dismiss
          </Button>
        </div>
      )}
    </div>
  );
}
