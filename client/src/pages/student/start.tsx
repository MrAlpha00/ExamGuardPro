import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { QrCode, ShieldCheck, PlayCircle } from "lucide-react";

export default function StudentStart() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-indigo-950 dark:to-purple-950 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-4">
            <i className="fas fa-user-graduate text-2xl text-white"></i>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Student Exam Portal
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose your verification method to begin the exam
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-500"
            onClick={() => setLocation("/student/auth")}
            data-testid="card-qr-verification"
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-xl">QR Code Verification</CardTitle>
              <CardDescription>
                Scan your hall ticket QR code to authenticate
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="button-qr-verification"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Scan QR Code
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-500"
            onClick={() => setLocation("/student/identity-verification")}
            data-testid="card-identity-verification"
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <CardTitle className="text-xl">Identity Verification</CardTitle>
              <CardDescription>
                Verify your identity with photo and document
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-purple-600 hover:bg-purple-700"
                data-testid="button-identity-verification"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Verify Identity
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-xl transition-all duration-300 cursor-pointer border-2 hover:border-indigo-500"
            onClick={() => setLocation("/student/auth")}
            data-testid="card-start-exam"
          >
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                  <PlayCircle className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>
              <CardTitle className="text-xl">Start Exam</CardTitle>
              <CardDescription>
                Begin your examination after authentication
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                data-testid="button-start-exam"
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Start Exam
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button
            variant="outline"
            onClick={() => setLocation("/")}
            data-testid="button-back-home"
          >
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
