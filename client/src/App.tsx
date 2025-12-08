import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ExamRoom from "@/pages/ExamRoom";
import Results from "@/pages/Results";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import QuestionBank from "@/pages/admin/QuestionBank";
import TutorDashboard from "@/pages/tutor/TutorDashboard";
import Pricing from "@/pages/Pricing";
import ExamSimulation from "@/pages/ExamSimulation";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/exam" component={ExamRoom} />
      <Route path="/exam/simulation" component={ExamSimulation} />
      <Route path="/results" component={Results} />
      <Route path="/pricing" component={Pricing} />
      
      {/* Admin Routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/questions" component={QuestionBank} />
      
      {/* Tutor Routes */}
      <Route path="/tutor" component={TutorDashboard} />
      
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
