import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, GraduationCap, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface StudentRouteGuardProps {
  children: React.ReactNode;
}

export function StudentRouteGuard({ children }: StudentRouteGuardProps) {
  const { user, loading, canAccessTutorMode, canAccessExams, userRole } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isStudent, setIsStudent] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);

  useEffect(() => {
    const checkStudentRole = async () => {
      if (!user) {
        setLocation("/login");
        return;
      }

      if (loading) {
        return;
      }

      // Check if user has student role (not tutor or admin)
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          setLocation("/login");
          setCheckingRole(false);
          return;
        }

        const response = await fetch(`/api/auth/me?supabaseId=${user.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();

          // Check email confirmation
          if (!userData.emailConfirmed && userData.email) {
            setShowAccessDenied(true);
            toast({
              title: "Email Confirmation Required",
              description: "Please confirm your email address before accessing the dashboard. Check your inbox for the confirmation link.",
              variant: "destructive",
            });
            setTimeout(() => {
              setLocation("/email-confirmation");
            }, 3000);
            return;
          }

          // Allow access if role is student or not set (default)
          if (!userData.role || userData.role === "student") {
            setIsStudent(true);
          } else if (userData.role === "tutor") {
            // Check if tutor has active subscription access
            if (userData.canAccessTutorMode && canAccessTutorMode) {
              // Tutors with active subscription should be redirected to tutor dashboard
              setShowAccessDenied(true);
              toast({
                title: "Access Denied",
                description: "You have an active tutor account. Please use the tutor dashboard. Redirecting...",
                variant: "destructive",
              });
              setTimeout(() => {
                setLocation("/tutor");
              }, 3000);
            } else {
              // Tutors without active subscription can access student dashboard
              // (they need to upgrade to use tutor features)
              setIsStudent(true);
            }
          } else if (userData.role === "admin") {
            // Admins can access student dashboard, but show info
            setIsStudent(true);
          }
        } else {
          // If we can't verify, allow access (fail open for students)
          setIsStudent(true);
        }
      } catch (error) {
        console.error("Error checking student role:", error);
        // Fail open for students
        setIsStudent(true);
      } finally {
        setCheckingRole(false);
      }
    };

    if (!loading) {
      void checkStudentRole();
    }
  }, [user, loading, canAccessTutorMode, setLocation, toast]);

  // Lock access if no paid subscription (unless admin)
  useEffect(() => {
    if (!loading && !checkingRole && isStudent && userRole !== "admin" && userRole !== "tutor") {
      if (!canAccessExams) {
        toast({
          title: "Plan Required",
          description: "Please choose a plan to access the dashboard and full exams.",
        });
        setLocation("/pricing");
      }
    }
  }, [loading, checkingRole, isStudent, canAccessExams, userRole, setLocation, toast]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showAccessDenied) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <GraduationCap className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Tutor account detected</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                You have a tutor account. Please use the tutor dashboard to manage your students and assignments.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setLocation("/tutor")}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Tutor Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

