import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Phone, Loader2, ArrowLeft, GraduationCap, Users, Building2, Send, CheckCircle2 } from "lucide-react";
import { validateEmail } from "@/lib/sanitize";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function TutorLogin() {
  const [, setLocation] = useLocation();
  const { signIn, signInWithOTP, verifyOTP, verifyEmailOTP, userRole, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"email" | "phone">("email");
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const { toast } = useToast();

  // Redirect based on role after successful login
  useEffect(() => {
    if (user && userRole) {
      // Small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        if (userRole === "tutor") {
          setLocation("/tutor");
        } else if (userRole === "admin") {
          setLocation("/admin");
        } else {
          // If student tries to use tutor login, redirect to student dashboard
          setLocation("/dashboard");
        }
      }, 500); // Increased delay to ensure role is fully loaded
      return () => clearTimeout(timer);
    }
  }, [user, userRole, setLocation]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate email format
    if (email && !validateEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message || "Failed to sign in. Please check your credentials and try again.");
        setLoading(false);
      } else {
        // Redirect will happen via useEffect when userRole is loaded
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate email format
    if (!email || !validateEmail(email)) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const { error } = await signIn(email);
      if (error) {
        setError(error.message || "Failed to send OTP. Please try again.");
      } else {
        setOtpSent(true);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await signInWithOTP(phone);
      if (error) {
        setError(error.message || "Failed to send OTP");
      } else {
        setOtpSent(true);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!email) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    try {
      const { error } = await verifyEmailOTP(email, otp);
      if (error) {
        setError(error.message || "Invalid OTP");
        setLoading(false);
      } else {
        // Redirect will happen via useEffect when userRole is loaded
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    // ... code ...
  };

  const [inquiryData, setInquiryData] = useState({
    institutionName: "",
    contactName: "",
    email: "",
    phone: "",
    studentCount: "1-50",
    useCase: "",
  });
  const [inquiryLoading, setInquiryLoading] = useState(false);
  const [inquirySuccess, setInquirySuccess] = useState(false);

  const handleInquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInquiryLoading(true);
    try {
      await apiRequest("POST", "/api/tutor-inquiries", inquiryData);
      setInquirySuccess(true);
      toast({
        title: "Inquiry Sent!",
        description: "We've received your request and will contact you soon.",
      });
      setTimeout(() => {
        setIsInquiryOpen(false);
        setInquirySuccess(false);
        setInquiryData({
          institutionName: "",
          contactName: "",
          email: "",
          phone: "",
          studentCount: "1-50",
          useCase: "",
        });
      }, 3000);
    } catch (err: any) {
      toast({
        title: "Submission failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setInquiryLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setLocation("/")}
        className="absolute left-4 top-4"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <GraduationCap className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Tutor Portal</CardTitle>
          <CardDescription className="text-center">
            Sign in to access your tutor dashboard and manage your students
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as "email" | "phone"); setOtpSent(false); setError(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone">
                <Phone className="h-4 w-4 mr-2" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              {!otpSent ? (
                <>
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="tutor@school.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                      />
                    </div>
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        <>
                          <GraduationCap className="mr-2 h-4 w-4" />
                          Sign In as Tutor
                        </>
                      )}
                    </Button>
                  </form>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">Or</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleEmailOTP}
                    disabled={loading}
                  >
                    Sign in with Email OTP
                  </Button>
                </>
              ) : (
                <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      We sent a code to {email}
                    </p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                  >
                    Back
                  </Button>
                </form>
              )}
            </TabsContent>

            <TabsContent value="phone" className="space-y-4 mt-4">
              {!otpSent ? (
                <form onSubmit={handlePhoneOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+234 800 000 0000"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      We'll send you a verification code via SMS
                    </p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otp-phone">Enter OTP</Label>
                    <Input
                      id="otp-phone"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                      maxLength={6}
                    />
                    <p className="text-sm text-muted-foreground">
                      We sent a code to {phone}
                    </p>
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      "Verify OTP"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => { setOtpSent(false); setOtp(""); }}
                  >
                    Back
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>

          <div className="mt-6 space-y-3">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-primary">For Tutors & Schools</p>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Don't have a tutor account? Contact us for custom pricing and access.
                  </p>
                  <Dialog open={isInquiryOpen} onOpenChange={setIsInquiryOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        Submit Inquiry
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5 text-primary" />
                          Institution Inquiry
                        </DialogTitle>
                        <DialogDescription>
                          Fill out this form and our team will get back to you with a custom quote.
                        </DialogDescription>
                      </DialogHeader>

                      {inquirySuccess ? (
                        <div className="py-12 text-center space-y-4">
                          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                          </div>
                          <h3 className="text-xl font-bold">Inquiry Submitted!</h3>
                          <p className="text-muted-foreground">Thank you for your interest. We'll be in touch shortly.</p>
                        </div>
                      ) : (
                        <form onSubmit={handleInquirySubmit} className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="institution">Institution Name</Label>
                              <Input
                                id="institution"
                                required
                                value={inquiryData.institutionName}
                                onChange={(e) => setInquiryData({ ...inquiryData, institutionName: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="contact">Contact Name</Label>
                              <Input
                                id="contact"
                                required
                                value={inquiryData.contactName}
                                onChange={(e) => setInquiryData({ ...inquiryData, contactName: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="iq-email">Email Address</Label>
                              <Input
                                id="iq-email"
                                type="email"
                                required
                                value={inquiryData.email}
                                onChange={(e) => setInquiryData({ ...inquiryData, email: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="iq-phone">Phone Number</Label>
                              <Input
                                id="iq-phone"
                                value={inquiryData.phone}
                                onChange={(e) => setInquiryData({ ...inquiryData, phone: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="student-count">Estimated Student Count</Label>
                            <select
                              id="student-count"
                              className="w-full h-10 px-3 bg-background border rounded-md"
                              value={inquiryData.studentCount}
                              onChange={(e) => setInquiryData({ ...inquiryData, studentCount: e.target.value })}
                            >
                              <option value="1-50">1 - 50</option>
                              <option value="51-100">51 - 100</option>
                              <option value="101-500">101 - 500</option>
                              <option value="500+">500+</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="use-case">Tell us about your needs</Label>
                            <Textarea
                              id="use-case"
                              placeholder="How do you plan to use PrepMaster?"
                              value={inquiryData.useCase}
                              onChange={(e) => setInquiryData({ ...inquiryData, useCase: e.target.value })}
                            />
                          </div>
                          <Button type="submit" className="w-full" disabled={inquiryLoading}>
                            {inquiryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Send Inquiry</>}
                          </Button>
                        </form>
                      )}
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </div>
            <div className="text-center text-sm">
              <p className="text-muted-foreground">
                Are you a student?{" "}
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => setLocation("/login")}
                >
                  Sign in as Student
                </Button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

