import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

export default function EmailConfirmation() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const checkEmailConfirmation = async () => {
      if (!user) {
        setLocation("/login");
        return;
      }

      try {
        // Check Supabase email confirmation status
        const { data: { user: supabaseUser } } = await supabase.auth.getUser();
        
        if (supabaseUser?.email_confirmed_at) {
          // Update our database
          await fetch("/api/auth/confirm-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supabaseId: user.id }),
          });
          setConfirmed(true);
        } else {
          setConfirmed(false);
        }
      } catch (err: any) {
        console.error("Error checking email confirmation:", err);
        setError("Failed to check email confirmation status");
      } finally {
        setLoading(false);
      }
    };

    void checkEmailConfirmation();

    // Listen for email confirmation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user?.email_confirmed_at) {
          await fetch("/api/auth/confirm-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ supabaseId: session.user.id }),
          });
          setConfirmed(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [user, setLocation]);

  const handleResendEmail = async () => {
    if (!user?.email) return;
    
    setResending(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
      });
      
      if (error) {
        setError(error.message || "Failed to resend confirmation email");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/signup")}
          className="absolute left-4 top-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Checking email confirmation...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 relative">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/signup")}
          className="absolute left-4 top-4"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-center">Email Confirmed!</CardTitle>
            <CardDescription className="text-center">
              Your email has been successfully confirmed. You can now access all features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => setLocation("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setLocation("/signup")}
        className="absolute left-4 top-4"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-center">Confirm Your Email</CardTitle>
          <CardDescription className="text-center">
            We've sent a confirmation email to <strong>{user?.email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Please check your email and click the confirmation link to verify your account. 
              You'll need to confirm your email before you can access your dashboard.
              <br /><br />
              <strong>Tips:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Check your spam/junk folder if you don't see it</li>
                <li>The confirmation link expires in 24 hours</li>
                <li>Didn't receive it? Click "Resend" below</li>
              </ul>
            </AlertDescription>
          </Alert>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Button 
              className="w-full" 
              onClick={handleResendEmail}
              disabled={resending}
              variant="outline"
            >
              {resending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Confirmation Email
                </>
              )}
            </Button>
            <Button 
              className="w-full" 
              onClick={() => setLocation("/login")}
              variant="ghost"
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

