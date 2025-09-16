import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { Question } from "@shared/schema";

export default function QuestionManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    examName: "",
    questionText: "",
    questionType: "multiple_choice" as const,
    options: ["", "", "", ""],
    correctAnswer: "",
    difficulty: "medium" as const,
    subject: "",
    topic: "",
    marks: 1,
  });
  
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch existing questions
  const { data: questions = [], isLoading } = useQuery({
    queryKey: ["/api/questions"],
  });

  // Create question mutation
  const createQuestionMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/questions", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      // Reset form
      setFormData({
        examName: "",
        questionText: "",
        questionType: "multiple_choice",
        options: ["", "", "", ""],
        correctAnswer: "",
        difficulty: "medium",
        subject: "",
        topic: "",
        marks: 1,
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await apiRequest("PUT", `/api/questions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      setShowEditModal(false);
      setSelectedQuestion(null);
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/questions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditing && selectedQuestion) {
      updateQuestionMutation.mutate({ id: selectedQuestion.id, data: formData });
    } else {
      createQuestionMutation.mutate(formData);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const handleEditQuestion = (question: Question) => {
    setSelectedQuestion(question);
    setFormData({
      examName: question.examName,
      questionText: question.questionText,
      questionType: question.questionType as "multiple_choice",
      options: question.options || ["", "", "", ""],
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty as "medium",
      subject: question.subject,
      topic: question.topic,
      marks: question.marks,
    });
    setIsEditing(true);
    setShowEditModal(true);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm("Are you sure you want to delete this question?")) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full shadow-2xl">
          <CardContent className="pt-6 text-center">
            <i className="fas fa-lock text-4xl text-red-500 mb-4"></i>
            <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
            <p className="text-muted-foreground mb-4">Admin access required</p>
            <Link href="/"><Button>Return Home</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Question Management</h1>
            <p className="text-white/80">Create and manage exam questions</p>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/admin/dashboard">
              <Button variant="secondary" data-testid="button-back-dashboard">
                <i className="fas fa-arrow-left mr-2"></i>Dashboard
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Question Form */}
          <div className="lg:col-span-1">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">
                    {isEditing ? "Edit Question" : "Add New Question"}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Exam Name */}
                  <div>
                    <Label htmlFor="examName">Exam Name</Label>
                    <Input
                      id="examName"
                      placeholder="Mathematics Final Exam 2024"
                      value={formData.examName}
                      onChange={(e) => handleInputChange("examName", e.target.value)}
                      required
                      data-testid="input-exam-name"
                    />
                  </div>

                  {/* Subject and Topic */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Mathematics"
                        value={formData.subject}
                        onChange={(e) => handleInputChange("subject", e.target.value)}
                        required
                        data-testid="input-subject"
                      />
                    </div>
                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Input
                        id="topic"
                        placeholder="Algebra"
                        value={formData.topic}
                        onChange={(e) => handleInputChange("topic", e.target.value)}
                        required
                        data-testid="input-topic"
                      />
                    </div>
                  </div>

                  {/* Question Text */}
                  <div>
                    <Label htmlFor="questionText">Question</Label>
                    <Textarea
                      id="questionText"
                      placeholder="Enter your question here..."
                      value={formData.questionText}
                      onChange={(e) => handleInputChange("questionText", e.target.value)}
                      required
                      className="min-h-[100px]"
                      data-testid="textarea-question"
                    />
                  </div>

                  {/* Question Type */}
                  <div>
                    <Label htmlFor="questionType">Question Type</Label>
                    <Select value={formData.questionType} onValueChange={(value) => handleInputChange("questionType", value)}>
                      <SelectTrigger data-testid="select-question-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="short_answer">Short Answer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Options (for multiple choice) */}
                  {formData.questionType === "multiple_choice" && (
                    <div>
                      <Label>Answer Options</Label>
                      <div className="space-y-2">
                        {formData.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{String.fromCharCode(65 + index)}.</span>
                            <Input
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                              value={option}
                              onChange={(e) => handleOptionChange(index, e.target.value)}
                              required
                              data-testid={`input-option-${index}`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Correct Answer */}
                  <div>
                    <Label htmlFor="correctAnswer">Correct Answer</Label>
                    {formData.questionType === "multiple_choice" ? (
                      <Select value={formData.correctAnswer} onValueChange={(value) => handleInputChange("correctAnswer", value)}>
                        <SelectTrigger data-testid="select-correct-answer">
                          <SelectValue placeholder="Select correct option" />
                        </SelectTrigger>
                        <SelectContent>
                          {formData.options.map((_, index) => (
                            <SelectItem key={index} value={String.fromCharCode(65 + index)}>
                              Option {String.fromCharCode(65 + index)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="correctAnswer"
                        placeholder="Enter correct answer"
                        value={formData.correctAnswer}
                        onChange={(e) => handleInputChange("correctAnswer", e.target.value)}
                        required
                        data-testid="input-correct-answer"
                      />
                    )}
                  </div>

                  {/* Difficulty and Marks */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select value={formData.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="marks">Marks</Label>
                      <Input
                        id="marks"
                        type="number"
                        min="1"
                        max="10"
                        value={formData.marks}
                        onChange={(e) => handleInputChange("marks", parseInt(e.target.value))}
                        required
                        data-testid="input-marks"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4">
                    {isEditing && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => {
                          setIsEditing(false);
                          setSelectedQuestion(null);
                          setShowEditModal(false);
                          setFormData({
                            questionText: "",
                            questionType: "multiple_choice",
                            options: ["", "", "", ""],
                            correctAnswer: "",
                            difficulty: "medium",
                            subject: "",
                            topic: "",
                            marks: 1,
                          });
                        }}
                        data-testid="button-cancel-edit"
                      >
                        Cancel
                      </Button>
                    )}
                    <Button 
                      type="submit" 
                      disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                      data-testid="button-submit-question"
                    >
                      {createQuestionMutation.isPending || updateQuestionMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          {isEditing ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        <>
                          <i className={`fas ${isEditing ? "fa-save" : "fa-plus"} mr-2`}></i>
                          {isEditing ? "Update Question" : "Add Question"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Questions List */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Exam Questions ({questions.length})</CardTitle>
                  <Button variant="outline" data-testid="button-bulk-import">
                    <i className="fas fa-upload mr-2"></i>Bulk Import
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Loading questions...</p>
                  </div>
                ) : questions.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-question-circle text-4xl text-muted-foreground mb-4"></i>
                    <p className="text-muted-foreground">No questions created yet</p>
                    <p className="text-sm text-muted-foreground">Add your first question using the form</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {questions.map((question: Question) => (
                      <div key={question.id} className="border rounded-lg p-4 bg-muted/50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                {question.subject}
                              </span>
                              <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-full">
                                {question.difficulty}
                              </span>
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                {question.marks} marks
                              </span>
                            </div>
                            <h4 className="font-medium text-sm mb-2">{question.questionText}</h4>
                            {question.questionType === "multiple_choice" && question.options && (
                              <div className="text-xs text-muted-foreground space-y-1">
                                {question.options.map((option, index) => (
                                  <div key={index} className={`${String.fromCharCode(65 + index) === question.correctAnswer ? 'text-green-600 font-medium' : ''}`}>
                                    {String.fromCharCode(65 + index)}. {option}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <Button size="sm" variant="outline" onClick={() => handleEditQuestion(question)} data-testid={`button-edit-${question.id}`}>
                              <i className="fas fa-edit"></i>
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteQuestion(question.id)} data-testid={`button-delete-${question.id}`}>
                              <i className="fas fa-trash"></i>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}