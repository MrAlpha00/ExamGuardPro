import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import WebcamMonitor from "@/components/webcam-monitor";
import FaceDetection from "@/components/face-detection";
import { useWebcam } from "@/hooks/useWebcam";
import { useFaceDetection } from "@/hooks/useFaceDetection";

interface HallTicketData {
  id: string;
  examName: string;
  studentName: string;
  rollNumber: string;
  examDate: string;
  duration: number;
}

export default function IdentityVerification() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [hallTicketData, setHallTicketData] = useState<HallTicketData | null>(null);
  const [verificationStep, setVerificationStep] = useState<'camera' | 'photo' | 'document' | 'complete'>('camera');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [documentUploaded, setDocumentUploaded] = useState(false);
  
  const { isActive: cameraActive, startCamera, stopCamera, capturePhoto } = useWebcam();
  const { faceDetected, confidence } = useFaceDetection();

  useEffect(() => {
    // Get hall ticket data from localStorage
    const storedData = localStorage.getItem("hallTicketData");
    if (!storedData) {
      toast({
        title: "No Hall Ticket Data",
        description: "Please complete authentication first",
        variant: "destructive",
      });
      setLocation("/student/auth");
      return;
    }
    
    try {
      setHallTicketData(JSON.parse(storedData));
    } catch (error) {
      toast({
        title: "Invalid Data",
        description: "Please complete authentication again",
        variant: "destructive",
      });
      setLocation("/student/auth");
    }
  }, [setLocation, toast]);

  const handleCapturePhoto = async () => {
    try {
      const photoData = await capturePhoto();
      if (photoData) {
        setCapturedPhoto(photoData);
        setVerificationStep('document');
        toast({
          title: "Photo Captured",
          description: "Photo captured successfully. Please upload your ID document.",
        });
      }
    } catch (error) {
      toast({
        title: "Capture Failed",
        description: "Failed to capture photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real implementation, you would upload the file to your server
      setDocumentUploaded(true);
      setVerificationStep('complete');
      toast({
        title: "Document Uploaded",
        description: "ID document uploaded successfully.",
      });
    }
  };

  const handleContinueToExam = () => {
    // Store verification completion
    localStorage.setItem("verificationComplete", "true");
    setLocation("/student/exam");
  };

  const getVerificationStatus = (step: string) => {
    switch (step) {
      case 'camera':
        return faceDetected ? 'completed' : cameraActive ? 'active' : 'pending';
      case 'photo':
        return capturedPhoto ? 'completed' : verificationStep === 'photo' ? 'active' : 'pending';
      case 'document':
        return documentUploaded ? 'completed' : verificationStep === 'document' ? 'active' : 'pending';
      default:
        return 'pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <i className="fas fa-check-circle text-green-500"></i>;
      case 'active':
        return <i className="fas fa-clock text-yellow-500"></i>;
      default:
        return <i className="fas fa-circle text-gray-400"></i>;
    }
  };

  if (!hallTicketData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-accent flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-id-card text-2xl text-white"></i>
          </div>
          <h1 className="text-2xl font-bold text-white">Identity Verification</h1>
          <p className="text-white/80 mt-2">Please verify your identity before starting the exam</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification Process */}
          <div className="space-y-6">
            {/* Live Photo Capture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-video text-accent"></i>
                  <span>Live Photo Capture</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <WebcamMonitor />
                  <FaceDetection />
                  
                  <div className="flex justify-between items-center">
                    <Button
                      onClick={cameraActive ? handleCapturePhoto : startCamera}
                      disabled={cameraActive && !faceDetected}
                      className="bg-accent hover:opacity-90"
                      data-testid="button-capture-photo"
                    >
                      <i className={`fas ${cameraActive ? 'fa-camera' : 'fa-video'} mr-2`}></i>
                      {cameraActive ? 'Capture Photo' : 'Start Camera'}
                    </Button>
                    <div className="flex items-center space-x-2">
                      <div className={`status-indicator ${faceDetected ? 'status-online' : 'status-warning'}`}></div>
                      <span className="text-sm text-muted-foreground">
                        {faceDetected ? `Face Detected (${Math.round(confidence * 100)}%)` : 'No Face Detected'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ID Document Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <i className="fas fa-id-card text-accent"></i>
                  <span>ID Document Verification</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center bg-muted">
                  {documentUploaded ? (
                    <div className="text-green-600">
                      <i className="fas fa-check-circle text-3xl mb-4"></i>
                      <p className="font-medium">Document uploaded successfully</p>
                    </div>
                  ) : (
                    <>
                      <i className="fas fa-id-card text-3xl text-muted-foreground mb-4"></i>
                      <p className="text-muted-foreground mb-4">
                        Upload your student ID or government-issued ID
                      </p>
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleDocumentUpload}
                          className="hidden"
                          id="document-upload"
                          data-testid="input-document-upload"
                        />
                        <label htmlFor="document-upload">
                          <Button asChild className="bg-primary hover:opacity-90">
                            <span>
                              <i className="fas fa-upload mr-2"></i>Choose File
                            </span>
                          </Button>
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Student Information & Progress */}
          <div className="space-y-6">
            {/* Student Information */}
            <Card>
              <CardHeader>
                <CardTitle>Student Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-xl p-6">
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <i className="fas fa-user text-white text-xl"></i>
                    </div>
                    <div>
                      <h4 className="font-semibold text-lg">{hallTicketData.studentName}</h4>
                      <p className="text-muted-foreground">Hall Ticket: {hallTicketData.hallTicketId || hallTicketData.id}</p>
                      <p className="text-muted-foreground">Roll: {hallTicketData.rollNumber}</p>
                      <p className="text-muted-foreground">Exam: {hallTicketData.examName}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Hall Ticket Verified:</span>
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-check-circle text-green-500"></i>
                        <span className="text-green-600 font-medium">Valid</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Photo Match:</span>
                      <div className="flex items-center space-x-2">
                        {capturedPhoto ? (
                          <>
                            <i className="fas fa-check-circle text-green-500"></i>
                            <span className="text-green-600 font-medium">Captured</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-clock text-yellow-500"></i>
                            <span className="text-yellow-600 font-medium">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">ID Document:</span>
                      <div className="flex items-center space-x-2">
                        {documentUploaded ? (
                          <>
                            <i className="fas fa-check-circle text-green-500"></i>
                            <span className="text-green-600 font-medium">Verified</span>
                          </>
                        ) : (
                          <>
                            <i className="fas fa-exclamation-circle text-yellow-500"></i>
                            <span className="text-yellow-600 font-medium">Pending</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verification Checklist */}
            <Card>
              <CardHeader>
                <CardTitle>Verification Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fas fa-check-circle text-green-500"></i>
                      <span className="text-green-800">Hall ticket validated</span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    capturedPhoto 
                      ? 'bg-green-50 border-green-200' 
                      : faceDetected 
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(getVerificationStatus('photo'))}
                      <span className={
                        capturedPhoto 
                          ? 'text-green-800' 
                          : faceDetected 
                            ? 'text-yellow-800'
                            : 'text-gray-600'
                      }>
                        Live photo captured
                      </span>
                    </div>
                  </div>
                  
                  <div className={`flex items-center justify-between p-3 rounded-lg border ${
                    documentUploaded 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(getVerificationStatus('document'))}
                      <span className={documentUploaded ? 'text-green-800' : 'text-gray-600'}>
                        ID document verified
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-4">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {
                  // Reset verification
                  setCapturedPhoto(null);
                  setDocumentUploaded(false);
                  setVerificationStep('camera');
                  if (cameraActive) stopCamera();
                }}
                data-testid="button-retry"
              >
                <i className="fas fa-redo mr-2"></i>Retry Verification
              </Button>
              <Button 
                className="flex-1 bg-primary hover:opacity-90"
                disabled={!capturedPhoto || !documentUploaded}
                onClick={handleContinueToExam}
                data-testid="button-continue"
              >
                <i className="fas fa-arrow-right mr-2"></i>Continue to Exam
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
