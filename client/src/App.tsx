import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";

// Admin pages
import HallTicketGeneration from "@/pages/admin/hall-ticket-generation";
import AdminDashboard from "@/pages/admin/dashboard";
import MonitoringSystem from "@/pages/admin/monitoring";
import IncidentManagement from "@/pages/admin/incidents";
import QuestionManagement from "@/pages/admin/question-management";
import Results from "@/pages/admin/results";

// Student pages
import StudentAuthentication from "@/pages/student/authentication";
import IdentityVerification from "@/pages/student/identity-verification";
import ExamMode from "@/pages/student/exam";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          
          {/* Admin routes */}
          <Route path="/admin/hall-tickets" component={HallTicketGeneration} />
          <Route path="/admin/dashboard" component={AdminDashboard} />
          <Route path="/admin/monitoring" component={MonitoringSystem} />
          <Route path="/admin/incidents" component={IncidentManagement} />
          <Route path="/admin/questions" component={QuestionManagement} />
          <Route path="/admin/results" component={Results} />
          
          {/* Student routes */}
          <Route path="/student/auth" component={StudentAuthentication} />
          <Route path="/student/verify" component={IdentityVerification} />
          <Route path="/student/exam" component={ExamMode} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
