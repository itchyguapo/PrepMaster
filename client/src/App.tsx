import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";
import { useInactivityLogout } from "@/hooks/useInactivityLogout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import ExamRoom from "@/pages/ExamRoom";
import Results from "@/pages/Results";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import QuestionBank from "@/pages/admin/QuestionBank";
import UserManagement from "@/pages/admin/UserManagement";
import SystemSettings from "@/pages/admin/SystemSettings";
import Finance from "@/pages/admin/Finance";
import ResourcesManagement from "@/pages/admin/ResourcesManagement";
import ActivityLogs from "@/pages/admin/ActivityLogs";
import TutorInquiries from "@/pages/admin/TutorInquiries";
// Ads management removed
import TutorDashboard from "@/pages/tutor/TutorDashboard";
import TutorGroups from "@/pages/tutor/Groups";
import CreateAssignment from "@/pages/tutor/CreateAssignment";
import TutorReports from "@/pages/tutor/Reports";
import TutorExams from "@/pages/tutor/TutorExams";
import CreateTutorExam from "@/pages/tutor/CreateTutorExam";
import TutorExamStats from "@/pages/tutor/TutorExamStats";
import TutorSettings from "@/pages/tutor/TutorSettings";
import PublicExamEntry from "@/pages/student/PublicExamEntry";
import TutorExamRoom from "@/pages/student/TutorExamRoom";
import TutorLogin from "@/pages/tutor/TutorLogin";
import { TutorRouteGuard } from "@/components/tutor/TutorRouteGuard";
import { StudentRouteGuard } from "@/components/student/StudentRouteGuard";
import Pricing from "@/pages/Pricing";
import ExamSimulation from "@/pages/ExamSimulation";
import PracticeCenter from "@/pages/PracticeCenter";
import PracticeTest from "@/pages/PracticeTest";
import Analytics from "@/pages/Analytics";
import Settings from "@/pages/Settings";
import Features from "@/pages/Features";
import Resources from "@/pages/Resources";
import ResourceViewer from "@/pages/ResourceViewer";
import EmailConfirmation from "@/pages/EmailConfirmation";
import PaymentCallback from "@/pages/PaymentCallback";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/tutor/login" component={TutorLogin} />
      <Route path="/signup" component={Signup} />
      <Route path="/email-confirmation" component={EmailConfirmation} />
      <Route path="/payment/callback" component={PaymentCallback} />
      <Route path="/dashboard">
        {() => (
          <StudentRouteGuard>
            <Dashboard />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/practice">
        {() => (
          <StudentRouteGuard>
            <PracticeCenter />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/practice-test">
        {() => (
          <StudentRouteGuard>
            <PracticeTest />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/analytics">
        {() => (
          <StudentRouteGuard>
            <Analytics />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/settings" component={Settings} />
      <Route path="/features" component={Features} />
      <Route path="/resources" component={Resources} />
      <Route path="/resources/:slug" component={ResourceViewer} />
      <Route path="/exam/:id">
        {() => (
          <StudentRouteGuard>
            <ExamRoom />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/exam/simulation">
        {() => (
          <StudentRouteGuard>
            <ExamSimulation />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/results">
        {() => (
          <StudentRouteGuard>
            <Results />
          </StudentRouteGuard>
        )}
      </Route>
      <Route path="/pricing" component={Pricing} />

      {/* Admin Routes - Protected by AdminRouteGuard */}
      <Route path="/admin">
        {() => (
          <AdminRouteGuard>
            <AdminDashboard />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/questions">
        {() => (
          <AdminRouteGuard>
            <QuestionBank />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/users">
        {() => (
          <AdminRouteGuard>
            <UserManagement />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/finance">
        {() => (
          <AdminRouteGuard>
            <Finance />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/activity">
        {() => (
          <AdminRouteGuard>
            <ActivityLogs />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/settings">
        {() => (
          <AdminRouteGuard>
            <SystemSettings />
          </AdminRouteGuard>
        )}
      </Route>
      <Route path="/admin/tutor-inquiries">
        {() => (
          <AdminRouteGuard>
            <TutorInquiries />
          </AdminRouteGuard>
        )}
      </Route>
      {/* Ads route removed */}
      <Route path="/admin/resources">
        {() => (
          <AdminRouteGuard>
            <ResourcesManagement />
          </AdminRouteGuard>
        )}
      </Route>

      {/* Tutor Routes - Protected by TutorRouteGuard */}
      <Route path="/tutor">
        {() => (
          <TutorRouteGuard>
            <TutorDashboard />
          </TutorRouteGuard>
        )}
      </Route>
      <Route path="/tutor/groups">
        {() => (
          <TutorRouteGuard>
            <TutorGroups />
          </TutorRouteGuard>
        )}
      </Route>
      <Route path="/tutor/create-assignment">
        {() => (
          <TutorRouteGuard>
            <CreateAssignment />
          </TutorRouteGuard>
        )}
      </Route>
      <Route path="/tutor/exams">
        {() => (
          <TutorRouteGuard>
            <TutorExams />
          </TutorRouteGuard>
        )}
      </Route>
      <Route path="/tutor/exams/create">
        {() => (
          <TutorRouteGuard>
            <CreateTutorExam />
          </TutorRouteGuard>
        )}
      </Route>
      <Route path="/tutor/exams/:id/stats">
        {() => (
          <TutorRouteGuard>
            <TutorExamStats />
          </TutorRouteGuard>
        )}
      </Route>

      <Route path="/public-exam/:id" component={PublicExamEntry} />
      <Route path="/public-exam/:id/room" component={TutorExamRoom} />
      <Route path="/tutor/reports">
        {() => (
          <TutorRouteGuard>
            <TutorReports />
          </TutorRouteGuard>
        )}
      </Route>
      <Route path="/tutor/settings">
        {() => (
          <TutorRouteGuard>
            <TutorSettings />
          </TutorRouteGuard>
        )}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  useInactivityLogout();
  return <Router />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
