import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Loader2, ShieldX, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface TutorRouteGuardProps {
  children: React.ReactNode;
}

export function TutorRouteGuard({ children }: TutorRouteGuardProps) {
  const { user, loading, canAccessTutorMode } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [checkingRole, setCheckingRole] = useState(true);
  const [isTutor, setIsTutor] = useState(false);
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [denialReason, setDenialReason] = useState<"no-role" | "no-subscription">("no-role");

  useEffect(() => {
    const checkTutorRole = async () => {
      if (!user) {
        setLocation("/login", { replace: true });
        return;
      }

      if (loading) {
        return;
      }

      // Check if user has tutor role and subscription access
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          setLocation("/login", { replace: true });
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
          // If user has role="tutor", they have access (subscription is optional for tutors)
          if (userData.role === "tutor") {
            setIsTutor(true);
          } else {
            // User doesn't have tutor role
            setDenialReason("no-role");
            // Show access denied message
            setShowAccessDenied(true);
            const message = "This page is only available for users with tutor role. Please contact support to get tutor access.";
            toast({
              title: "Access Denied",
              description: message,
              variant: "destructive",
            });
            // Redirect after showing message
            setTimeout(() => {
              setLocation("/dashboard");
            }, 3000);
          }
        } else {
          setShowAccessDenied(true);
          setDenialReason("no-role");
          toast({
            title: "Access Denied",
            description: "Unable to verify tutor access. Redirecting to student dashboard...",
            variant: "destructive",
          });
          setTimeout(() => {
            setLocation("/dashboard");
          }, 3000);
        }
      } catch (error) {
        console.error("Error checking tutor role:", error);
        setShowAccessDenied(true);
        setDenialReason("no-role");
        toast({
          title: "Access Denied",
          description: "Unable to verify tutor access. Redirecting to student dashboard...",
          variant: "destructive",
        });
        setTimeout(() => {
          setLocation("/dashboard");
        }, 3000);
      } finally {
        setCheckingRole(false);
      }
    };

    if (!loading) {
      void checkTutorRole();
    }
  }, [user, loading, canAccessTutorMode, setLocation, toast]);

  if (loading || checkingRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Verifying tutor access...</p>
        </div>
      </div>
    );
  }

  if (showAccessDenied || !isTutor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <ShieldX className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>Tutor privileges required</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <AlertDescription>
                {denialReason === "no-subscription"
                  ? "Tutor mode access requires a custom subscription. Please contact support for custom pricing."
                  : "You don't have tutor access. This page is only available for users with tutor role and premium/enterprise subscription."}
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => setLocation("/dashboard")}
              className="w-full"
              variant="default"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Student Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

