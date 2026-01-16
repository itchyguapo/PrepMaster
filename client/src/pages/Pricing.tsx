import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, X, Loader2, CheckCircle2, Table2, Grid3x3, Star, Quote, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { TutorInquiryForm } from "@/components/pricing/TutorInquiryForm";

type PricingTier = {
  name: string;
  planId: "basic" | "standard" | "premium";
  monthlyPrice: number;
  annualPrice: number;
  description: string;
  features: string[];
  notIncluded: string[];
  cta: string;
  variant: "default" | "outline";
  popular?: boolean;
};

type ViewMode = "cards" | "table";

export default function Pricing() {
  const { user, subscriptionPlan, subscriptionStatus, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("monthly");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);

  // Calculate annual prices (2 months free = 10 months price)
  const annualDiscount = 0.17; // ~2 months free

  // Fetch pricing from admin settings (for now using defaults, can be made dynamic later)
  useEffect(() => {
    setPricingTiers([
      {
        name: "Basic",
        planId: "basic",
        monthlyPrice: 2000,
        annualPrice: Math.round(2000 * 10), // 10 months price
        description: "Essential practice for focused students.",
        features: [
          "Access to WAEC OR JAMB (Choose one)",
          "1 Full Practice Test per day",
          "Basic Score Report",
          "Mobile Friendly",
          "Email Support"
        ],
        notIncluded: [
          "Topic-based Practice",
          "Detailed Explanations",
          "Performance Analytics",
          "Offline Mode",
          "PDF Reports"
        ],
        cta: "Get Started",
        variant: "outline"
      },
      {
        name: "Standard",
        planId: "standard",
        monthlyPrice: 3500,
        annualPrice: Math.round(3500 * 10), // 10 months price
        description: "The most popular choice for serious candidates.",
        features: [
          "Access to BOTH WAEC & JAMB",
          "3 Practice Tests per day",
          "Topic-based Practice Mode",
          "Detailed Explanations",
          "30-Day Performance History",
          "Offline Exam Downloads",
          "Priority Email Support"
        ],
        notIncluded: [
          "Lifetime Test History",
          "PDF Reports"
        ],
        cta: "Choose Standard",
        popular: true,
        variant: "default"
      },
      {
        name: "Premium",
        planId: "premium",
        monthlyPrice: 5000,
        annualPrice: Math.round(5000 * 10), // 10 months price
        description: "Maximum features for serious exam preparation.",
        features: [
          "Everything in Standard",
          "Unlimited Practice Tests",
          "Lifetime Test History",
          "Performance PDF Reports",
          "Advanced Analytics with Readiness Scores",
          "Priority Customer Support",
          "Early Access to New Features"
        ],
        notIncluded: [],
        cta: "Go Premium",
        variant: "outline",
        popular: false
      }
    ]);
  }, []);

  // Get all unique features for comparison table
  const allFeatures = useMemo(() => {
    const featureSet = new Set<string>();
    pricingTiers.forEach(tier => {
      tier.features.forEach(f => featureSet.add(f));
      tier.notIncluded.forEach(f => featureSet.add(f));
    });
    return Array.from(featureSet);
  }, [pricingTiers]);

  // Check if user is on current plan or higher
  const isCurrentOrHigherPlan = (planId: "basic" | "standard" | "premium"): boolean => {
    if (!user || !subscriptionPlan) return false;

    const planHierarchy = { basic: 0, standard: 1, premium: 2 };
    const currentPlanLevel = planHierarchy[subscriptionPlan] || 0;
    const selectedPlanLevel = planHierarchy[planId] || 0;

    return currentPlanLevel >= selectedPlanLevel && subscriptionStatus !== "unpaid";
  };

  // Check if user is on this exact plan
  const isCurrentPlan = (planId: "basic" | "standard" | "premium"): boolean => {
    return subscriptionPlan === planId && subscriptionStatus !== "unpaid";
  };

  const handlePlanSelect = async (tier: PricingTier) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please log in to subscribe to a plan.",
        variant: "default",
      });
      setLocation(`/login?redirect=/pricing&plan=${tier.planId}`);
      return;
    }

    if (isCurrentOrHigherPlan(tier.planId)) {
      if (isCurrentPlan(tier.planId)) {
        toast({
          title: "Already Subscribed",
          description: `You're already on the ${tier.name} plan.`,
        });
      } else {
        toast({
          title: "Higher Plan Active",
          description: `You're already on a higher plan than ${tier.name}.`,
        });
      }
      return;
    }

    setLoading(tier.planId);

    try {
      // Initialize payment with Paystack
      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          plan: tier.planId,
          billingPeriod,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initialize payment");
      }

      const data = await res.json();

      // Redirect to Paystack payment page
      window.location.href = data.authorization_url;
    } catch (err: any) {
      console.error("Error initializing payment:", err);
      toast({
        title: "Payment Error",
        description: err.message || "Failed to start payment process. Please try again.",
        variant: "destructive",
      });
      setLoading(null);
    }
  };

  const formatPrice = (price: number) => {
    return `₦${price.toLocaleString()}`;
  };

  const getPrice = (tier: PricingTier) => {
    return billingPeriod === "monthly" ? tier.monthlyPrice : tier.annualPrice;
  };

  const getPeriod = () => {
    return billingPeriod === "monthly" ? "/month" : "/year";
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20 container mx-auto px-4 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-24 pb-20 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 space-y-3 sm:space-y-4 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold leading-tight">Simple, Transparent Pricing</h1>
          <p className="text-base sm:text-xl text-muted-foreground">Invest in your success for less than the cost of a textbook.</p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <Label htmlFor="billing-toggle" className="text-sm font-medium">
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={billingPeriod === "annual"}
            onCheckedChange={(checked) => setBillingPeriod(checked ? "annual" : "monthly")}
          />
          <div className="flex items-center gap-2">
            <Label htmlFor="billing-toggle" className="text-sm font-medium cursor-pointer">
              Annual
            </Label>
            <Badge variant="secondary" className="text-xs">
              Save 17%
            </Badge>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Button
            variant={viewMode === "cards" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("cards")}
          >
            <Grid3x3 className="h-4 w-4 mr-2" />
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4 mr-2" />
            Compare
          </Button>
        </div>

        {/* Cards View */}
        {viewMode === "cards" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto mb-16 justify-items-center">
            {pricingTiers.map((tier, i) => {
              const isCurrent = isCurrentPlan(tier.planId);
              const isHigher = isCurrentOrHigherPlan(tier.planId);
              const isLoading = loading === tier.planId;
              const isDisabled = isHigher || isLoading;
              const price = getPrice(tier);
              const savings = billingPeriod === "annual" ? Math.round(tier.monthlyPrice * 12 - tier.annualPrice) : 0;

              return (
                <Card key={i} className={`relative flex flex-col w-full max-w-[350px] sm:max-w-none ${tier.popular ? 'border-primary shadow-xl sm:scale-105 z-10' : 'border-border'} ${isCurrent ? 'ring-2 ring-primary' : ''}`}>
                  {tier.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">Most Popular</Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-4 right-4">
                      <Badge variant="secondary" className="bg-green-500 text-white px-3 py-1 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  {billingPeriod === "annual" && savings > 0 && (
                    <div className="absolute top-12 right-4">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-xs">
                        Save ₦{savings.toLocaleString()}
                      </Badge>
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                    <CardDescription>{tier.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{formatPrice(price)}</span>
                      <span className="text-muted-foreground">{getPeriod()}</span>
                      {billingPeriod === "annual" && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatPrice(Math.round(price / 12))}/month billed annually
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ul className="space-y-3">
                      {tier.features.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                      {tier.notIncluded.map((feature, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className={`w-full ${tier.popular ? 'bg-primary hover:bg-primary/90' : ''}`}
                      variant={tier.variant as any}
                      size="lg"
                      onClick={() => handlePlanSelect(tier)}
                      disabled={isDisabled}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrent ? (
                        "Current Plan"
                      ) : isHigher ? (
                        "Already Upgraded"
                      ) : (
                        tier.cta
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}

            {/* Tutor & Schools Card */}
            <Card className="relative flex flex-col w-full max-w-[350px] sm:max-w-none border-primary/20 bg-primary/[0.02]">
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-wider">Institutional</Badge>
                </div>
                <CardTitle className="text-2xl font-bold">For Tutors & Schools</CardTitle>
                <CardDescription>Custom solutions for educational organizations.</CardDescription>
                <div className="mt-4">
                  <span className="text-2xl sm:text-3xl font-bold text-primary">Custom Pricing</span>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1">Based on student volume</p>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Multi-student Management</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Group Performance Analytics</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Custom Brand Dashboard</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Bulk Account Licensing</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
                  variant="default"
                  size="lg"
                  onClick={() => {
                    document.getElementById('tutor-enquiry')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Make Enquiry
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {/* Comparison Table View */}
        {viewMode === "table" && (
          <div className="max-w-6xl mx-auto mb-16 overflow-x-auto">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-semibold">Features</th>
                        {pricingTiers.map((tier, i) => (
                          <th key={i} className={`text-center p-4 font-semibold ${tier.popular ? 'bg-primary/10' : ''}`}>
                            <div className="space-y-1">
                              <div className="text-lg">{tier.name}</div>
                              <div className="text-2xl font-bold">{formatPrice(getPrice(tier))}</div>
                              <div className="text-sm text-muted-foreground">{getPeriod()}</div>
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allFeatures.map((feature, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="p-4 font-medium">{feature}</td>
                          {pricingTiers.map((tier, i) => {
                            const hasFeature = tier.features.includes(feature);
                            const notIncluded = tier.notIncluded.includes(feature);
                            return (
                              <td key={i} className={`text-center p-4 ${tier.popular ? 'bg-primary/5' : ''}`}>
                                {hasFeature ? (
                                  <Check className="h-5 w-5 text-green-600 mx-auto" />
                                ) : notIncluded ? (
                                  <X className="h-5 w-5 text-muted-foreground mx-auto" />
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td className="p-4 font-medium">Price</td>
                        {pricingTiers.map((tier, i) => (
                          <td key={i} className={`text-center p-4 font-bold ${tier.popular ? 'bg-primary/5' : ''}`}>
                            {formatPrice(getPrice(tier))}
                            <span className="text-sm text-muted-foreground font-normal">{getPeriod()}</span>
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Current Plan Info for Logged-in Users */}
        {user && subscriptionPlan && (
          <div className="mt-12 text-center mb-16">
            <Card className="max-w-2xl mx-auto">
              <CardContent className="pt-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <p className="text-sm font-medium">
                    Your Current Plan: <span className="font-bold capitalize">{subscriptionPlan || "Basic"}</span>
                  </p>
                </div>
                {subscriptionPlan === "standard" || subscriptionPlan === "premium" ? (
                  <p className="text-xs text-muted-foreground">
                    You have active {subscriptionPlan === "premium" ? "premium" : "standard"} access. Manage your subscription from your dashboard.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Upgrade to unlock all features and improve your exam preparation.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Testimonials Section */}
        <div className="max-w-6xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">What Students Are Saying</h2>
            <p className="text-muted-foreground">Join thousands of successful candidates</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Amina Okafor",
                role: "WAEC Candidate",
                rating: 5,
                text: "PrepMaster helped me score 85% in Mathematics! The practice tests were exactly like the real exam.",
                plan: "Standard"
              },
              {
                name: "Chukwuemeka Adebayo",
                role: "JAMB Candidate",
                rating: 5,
                text: "The offline mode is a game-changer. I could study even without internet. Worth every naira!",
                plan: "Premium"
              },
              {
                name: "Fatima Ibrahim",
                role: "NECO Candidate",
                rating: 5,
                text: "The analytics dashboard showed me exactly where I needed to improve. My scores improved by 30%!",
                plan: "Standard"
              }
            ].map((testimonial, i) => (
              <Card key={i} className="relative">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-1 mb-3">
                    {[...Array(testimonial.rating)].map((_, j) => (
                      <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <Quote className="h-8 w-8 text-muted-foreground/20 absolute top-4 right-4" />
                  <p className="text-sm mb-4 relative z-10">{testimonial.text}</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{testimonial.plan} Plan</Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">Frequently Asked Questions</h2>
            <p className="text-muted-foreground">Everything you need to know about our pricing</p>
          </div>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>Can I change my plan later?</AccordionTrigger>
              <AccordionContent>
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>What payment methods do you accept?</AccordionTrigger>
              <AccordionContent>
                We accept all major payment methods including bank transfers, debit/credit cards, and mobile money. All payments are processed securely.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>Is there a free trial?</AccordionTrigger>
              <AccordionContent>
                We offer a free practice demo with 5 questions per subject. This gives you a taste of what PrepMaster offers before subscribing to a full plan.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-4">
              <AccordionTrigger>What happens if I cancel my subscription?</AccordionTrigger>
              <AccordionContent>
                You'll continue to have access to all features until the end of your current billing period. After that, you'll be moved to the Basic plan with limited access.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-5">
              <AccordionTrigger>Do you offer discounts for schools?</AccordionTrigger>
              <AccordionContent>
                Absolutely! We offer special bulk pricing for schools and educational institutions. Contact our sales team at support@prepmaster.ng for custom pricing.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-6">
              <AccordionTrigger>Can I use PrepMaster offline?</AccordionTrigger>
              <AccordionContent>
                Yes! With Standard and Premium plans, you can download exams for offline use. Perfect for studying without internet connectivity.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* Tutor/School Section */}
        <div id="tutor-enquiry" className="mt-20 max-w-4xl mx-auto scroll-mt-24">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">For Tutors & Educational Institutions</h2>
            <p className="text-muted-foreground text-lg">
              Custom pricing and features designed for schools, tutoring centers, and educational organizations
            </p>
          </div>
          <TutorInquiryForm />
        </div>
      </div>
    </div>
  );
}
