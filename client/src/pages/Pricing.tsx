import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Pricing() {
  const tiers = [
    {
      name: "Basic",
      price: "₦1,500",
      period: "/month",
      description: "Essential practice for focused students.",
      features: [
        "Access to WAEC OR JAMB (Choose one)",
        "1 Full Practice Test per day",
        "Basic Score Report",
        "Mobile Friendly"
      ],
      notIncluded: [
        "Topic Filtering",
        "Detailed Explanations",
        "Tutor Mode Access",
        "Offline Mode"
      ],
      cta: "Get Started",
      variant: "outline"
    },
    {
      name: "Standard",
      price: "₦2,500",
      period: "/month",
      description: "The most popular choice for serious candidates.",
      features: [
        "Access to BOTH WAEC & JAMB",
        "Unlimited Practice Tests",
        "Topic-based Practice Mode",
        "Full Analytics Dashboard",
        "30-Day History",
        "Detailed Explanations"
      ],
      notIncluded: [
        "Tutor Mode Access",
        "Priority Support"
      ],
      cta: "Choose Standard",
      popular: true,
      variant: "default"
    },
    {
      name: "Premium",
      price: "₦4,000",
      period: "/month",
      description: "Complete access with tutor features.",
      features: [
        "Everything in Standard",
        "Tutor Mode (Create & Assign Tests)",
        "Lifetime Test History",
        "Performance PDF Reports",
        "Priority Customer Support",
        "Offline Capabilities"
      ],
      notIncluded: [],
      cta: "Go Premium",
      variant: "outline"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="pt-24 pb-20 container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <h1 className="text-4xl md:text-5xl font-display font-bold">Simple, Transparent Pricing</h1>
          <p className="text-xl text-muted-foreground">Invest in your future for less than the cost of a textbook.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, i) => (
            <Card key={i} className={`relative flex flex-col ${tier.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-border'}`}>
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-2xl font-bold">{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground">{tier.period}</span>
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
                >
                  {tier.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-20 text-center">
          <p className="text-muted-foreground">
            Looking for a school license? <a href="#" className="text-primary font-bold hover:underline">Contact our sales team</a> for bulk discounts.
          </p>
        </div>
      </div>
    </div>
  );
}
