import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-primary flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-graduation-cap text-2xl text-white"></i>
              </div>
              <h1 className="text-2xl font-bold text-foreground">SecureExam</h1>
              <p className="text-muted-foreground">
                Secure Online Examination Platform
              </p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Welcome to SecureExam - A comprehensive examination platform with AI-powered proctoring and real-time monitoring.
              </p>
              
              <Button
                onClick={() => window.location.href = "/api/login"}
                className="w-full bg-primary hover:opacity-90"
                data-testid="button-login"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Login to Continue
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>Features include:</p>
              <ul className="mt-2 space-y-1">
                <li>• QR Code Hall Ticket Authentication</li>
                <li>• AI-Powered Face Detection & Monitoring</li>
                <li>• Real-time Admin Dashboard</li>
                <li>• Secure Kiosk Exam Mode</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
