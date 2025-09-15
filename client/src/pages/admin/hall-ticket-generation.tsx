import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import type { HallTicket } from "@shared/schema";

export default function HallTicketGeneration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    examName: "",
    examDate: "",
    duration: 180,
    totalQuestions: 50,
    rollNumber: "",
    studentName: "",
    studentEmail: "",
  });

  // Fetch existing hall tickets
  const { data: hallTickets = [], isLoading } = useQuery({
    queryKey: ["/api/hall-tickets"],
  });

  // Create hall ticket mutation
  const createHallTicketMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest("POST", "/api/hall-tickets", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Hall ticket created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/hall-tickets"] });
      // Reset form
      setFormData({
        examName: "",
        examDate: "",
        duration: 180,
        totalQuestions: 50,
        rollNumber: "",
        studentName: "",
        studentEmail: "",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createHallTicketMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">Admin access required</p>
            <Link href="/">
              <Button className="mt-4" data-testid="button-home">
                Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary">
      {/* Header */}
      <div className="glass-header px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <i className="fas fa-graduation-cap text-white text-2xl"></i>
            <h1 className="text-2xl font-bold text-white">SecureExam - Admin Portal</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-white text-sm">
              <span className="opacity-75">Admin:</span> {user?.firstName || user?.email}
            </div>
            <Button
              variant="secondary"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hall Ticket Generation Form */}
          <div className="lg:col-span-2">
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">Generate Hall Tickets</CardTitle>
                  <Button variant="outline" data-testid="button-bulk-export">
                    <i className="fas fa-download mr-2"></i>Bulk Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="examName">Exam Details</Label>
                      <Input
                        id="examName"
                        placeholder="Computer Science Final"
                        value={formData.examName}
                        onChange={(e) => handleInputChange("examName", e.target.value)}
                        required
                        data-testid="input-exam-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="examDate">Exam Date</Label>
                      <Input
                        id="examDate"
                        type="date"
                        value={formData.examDate}
                        onChange={(e) => handleInputChange("examDate", e.target.value)}
                        required
                        data-testid="input-exam-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="duration">Duration (minutes)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={formData.duration}
                        onChange={(e) => handleInputChange("duration", parseInt(e.target.value))}
                        required
                        data-testid="input-duration"
                      />
                    </div>
                    <div>
                      <Label htmlFor="totalQuestions">Total Questions</Label>
                      <Input
                        id="totalQuestions"
                        type="number"
                        value={formData.totalQuestions}
                        onChange={(e) => handleInputChange("totalQuestions", parseInt(e.target.value))}
                        required
                        data-testid="input-total-questions"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rollNumber">Roll Number</Label>
                      <Input
                        id="rollNumber"
                        placeholder="CS21B1234"
                        value={formData.rollNumber}
                        onChange={(e) => handleInputChange("rollNumber", e.target.value)}
                        required
                        data-testid="input-roll-number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="studentName">Student Name</Label>
                      <Input
                        id="studentName"
                        placeholder="John Smith"
                        value={formData.studentName}
                        onChange={(e) => handleInputChange("studentName", e.target.value)}
                        required
                        data-testid="input-student-name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor="studentEmail">Student Email</Label>
                      <Input
                        id="studentEmail"
                        type="email"
                        placeholder="john.smith@university.edu"
                        value={formData.studentEmail}
                        onChange={(e) => handleInputChange("studentEmail", e.target.value)}
                        required
                        data-testid="input-student-email"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" data-testid="button-save-draft">
                      Save Draft
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createHallTicketMutation.isPending}
                      data-testid="button-generate"
                    >
                      {createHallTicketMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-qrcode mr-2"></i>Generate Hall Ticket
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div>
            <Card className="shadow-xl">
              <CardHeader>
                <CardTitle>Hall Ticket Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-6 rounded-lg border-2 border-dashed border-primary">
                  <div className="text-center mb-4">
                    <h4 className="font-bold text-lg">UNIVERSITY EXAMINATION</h4>
                    <p className="text-sm text-muted-foreground">{formData.examName || "Exam Name"}</p>
                  </div>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Roll Number:</span>
                      <span className="font-medium">{formData.rollNumber || "CS21B1234"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Student Name:</span>
                      <span className="font-medium">{formData.studentName || "Student Name"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date & Time:</span>
                      <span className="font-medium">{formData.examDate || "Date"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span className="font-medium">{formData.duration} minutes</span>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-center">
                    <div className="qr-scanner">
                      <div className="text-center">
                        <div className="grid grid-cols-8 gap-1 mb-2">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={`w-3 h-3 ${Math.random() > 0.5 ? 'bg-foreground' : 'bg-muted'}`} 
                            />
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground">Scan to verify</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-xs text-muted-foreground text-center">
                    Hall Ticket ID: Will be generated
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Hall Tickets */}
            <Card className="shadow-xl mt-6">
              <CardHeader>
                <CardTitle>Recent Hall Tickets</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  </div>
                ) : hallTickets.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No hall tickets created yet</p>
                ) : (
                  <div className="space-y-3">
                    {hallTickets.slice(0, 5).map((ticket: HallTicket) => (
                      <div key={ticket.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <div className="font-medium text-sm">{ticket.rollNumber}</div>
                          <div className="text-xs text-muted-foreground">{ticket.studentName}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="status-indicator status-online"></div>
                          <span className="text-xs text-muted-foreground">Active</span>
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
