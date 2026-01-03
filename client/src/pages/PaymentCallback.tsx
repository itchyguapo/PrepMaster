import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function PaymentCallback() {
  const [, setLocation] = useLocation();
  // @ts-ignore
  const { refreshAuth } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyPayment = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const reference = urlParams.get("reference");

      if (!reference) {
        setStatus("error");
        setMessage("No payment reference found");
        return;
      }

      try {
        const res = await fetch(`/api/payments/verify/${reference}`);
        const data = await res.json();

        if (data.success) {
          setStatus("success");
          setMessage("Payment successful! Your subscription has been activated.");
          // Refresh auth context to get updated subscription
          if (refreshAuth) {
            await refreshAuth();
          }
          // Redirect to dashboard after 3 seconds
          setTimeout(() => {
            setLocation("/dashboard");
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.message || "Payment verification failed");
        }
      } catch (err: any) {
        console.error("Payment verification error:", err);
        setStatus("error");
        setMessage("Failed to verify payment. Please contact support if the payment was successful.");
      }
    };

    void verifyPayment();
  }, [setLocation, refreshAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center">Payment Processing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "loading" && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Verifying your payment...</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold">Payment Successful!</h2>
              <p className="text-muted-foreground">{message}</p>
              <Button onClick={() => setLocation("/dashboard")} className="w-full">
                Go to Dashboard
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold">Payment Failed</h2>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLocation("/pricing")} className="flex-1">
                  Try Again
                </Button>
                <Button onClick={() => setLocation("/dashboard")} className="flex-1">
                  Go to Dashboard
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

