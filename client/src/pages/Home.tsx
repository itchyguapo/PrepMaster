import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Brain, Clock, BarChart, ShieldCheck, BookOpen, Users, Target, Zap, Download, Award, TrendingUp, FileText, Video, Smartphone } from "lucide-react";
import heroImage from "@assets/images/hero-bg.png";
import { Link } from "wouter";

export default function Home() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary">
      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
              <Badge variant="outline" className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5 text-primary rounded-full">
                🇳🇬 Trusted by 50,000+ Nigerian Students
              </Badge>
              <h1 className="text-5xl lg:text-7xl font-display font-bold leading-[1.1] tracking-tight">
                Smash Your <br />
                <span className="text-primary relative inline-block">
                  WAEC & JAMB
                  <svg className="absolute -bottom-2 left-0 w-full h-3 text-secondary" viewBox="0 0 100 10" preserveAspectRatio="none">
                    <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" opacity="0.6" />
                  </svg>
                </span>
                <br /> Exams.
              </h1>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Practice with authentic past questions, get instant explanations, and track your progress. Try our free practice test - no account needed!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/practice-test">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
                    Free Practice Test
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-2 hover:bg-accent hover:text-accent-foreground">
                    Sign Up
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 text-sm text-muted-foreground pt-4">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Real Past Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Timed CBT Mode</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span>Offline Support</span>
                </div>
              </div>
            </div>

            <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-200">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary to-secondary opacity-20 blur-3xl rounded-[3rem]" />
              <div className="relative rounded-[2rem] overflow-hidden border border-border shadow-2xl">
                <img
                  src={heroImage}
                  alt="Students studying"
                  className="w-full h-full object-cover scale-105 hover:scale-100 transition-transform duration-700"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 text-white">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl border border-white/10">
                      <Brain className="h-8 w-8 text-secondary" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">AI-Powered Insights</p>
                      <p className="text-white/80 text-sm">Know exactly what to study next.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Element */}
              <Card className="absolute -bottom-8 -left-8 w-72 shadow-xl border-primary/10 animate-bounce duration-[3000ms]">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    <TrendingUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Average Improvement</p>
                    <p className="font-bold text-xl text-primary">+42% Score Boost</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Students see results in 2 weeks</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold">Key Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need to ace your exams.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Clock,
                title: "CBT Simulation",
                desc: "Practice under real exam conditions with timed tests."
              },
              {
                icon: BarChart,
                title: "Performance Analytics",
                desc: "Track your progress and identify weak areas."
              },
              {
                icon: ShieldCheck,
                title: "Detailed Explanations",
                desc: "Understand the 'why' behind every answer."
              },
              {
                icon: BookOpen,
                title: "Large Question Bank",
                desc: "Thousands of authentic past questions."
              },
              {
                icon: Target,
                title: "Randomized Tests",
                desc: "Custom practice exams tailored to your needs."
              },
              {
                icon: Zap,
                title: "Instant Feedback",
                desc: "Get immediate results and score breakdowns."
              },
              {
                icon: Download,
                title: "Offline Mode",
                desc: "Practice anywhere, even without internet."
              },
              {
                icon: Award,
                title: "Progress Tracking",
                desc: "Monitor your improvement over time."
              }
            ].map((feature, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-8 space-y-4">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-bold font-display">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Exam Bodies Badge Section */}
      <section className="py-12 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <p className="text-sm text-muted-foreground mb-4">Supported Exam Bodies</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Badge variant="outline" className="px-6 py-2 text-base font-semibold border-primary/30 bg-primary/5">
                WAEC
              </Badge>
              <Badge variant="outline" className="px-6 py-2 text-base font-semibold border-primary/30 bg-primary/5">
                JAMB
              </Badge>
              <Badge variant="outline" className="px-6 py-2 text-base font-semibold border-primary/30 bg-primary/5">
                NECO
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="py-16 bg-background border-y">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">10,000+</div>
              <p className="text-sm text-muted-foreground">Past Questions</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">95%</div>
              <p className="text-sm text-muted-foreground">Pass Rate</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">+42%</div>
              <p className="text-sm text-muted-foreground">Avg Score Boost</p>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50K+</div>
              <p className="text-sm text-muted-foreground">Students</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold">What Students Say</h2>
            <p className="text-lg text-muted-foreground">Real results from real students</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                name: "Chiamaka O.",
                score: "Scored 85% in WAEC",
                quote: "PrepMaster helped me identify my weak areas. The practice tests were exactly like the real exam. I passed with flying colors!",
                improvement: "+35%"
              },
              {
                name: "Emeka T.",
                score: "JAMB Score: 285",
                quote: "The offline mode saved me during exam prep. I could practice anywhere, anytime. Best investment for my education.",
                improvement: "+48%"
              },
              {
                name: "Amina K.",
                score: "WAEC: 7 A's",
                quote: "The detailed explanations after each question helped me understand concepts I struggled with. Highly recommend!",
                improvement: "+52%"
              }
            ].map((testimonial, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/50 transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.score}</p>
                    </div>
                  </div>
                  <p className="text-muted-foreground italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-medium text-green-600">{testimonial.improvement} improvement</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Teaser */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-2xl font-display font-bold mb-2">Simple, Affordable Pricing</h3>
          <p className="text-muted-foreground mb-6">
            Start with our free plan or choose a plan that fits your needs
          </p>
          <Link href="/pricing">
            <Button size="lg" variant="outline" className="h-12 px-6">
              View Pricing Plans
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Ready to ace your exams?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of students already using PrepMaster to excel in their WAEC and JAMB exams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/practice-test">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90">
                Free Practice Test
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/signup">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-2">
                Sign Up
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-bold text-lg mb-4">PrepMaster</h4>
              <p className="text-sm text-muted-foreground">
                Your trusted partner for WAEC and JAMB exam preparation.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/features" className="hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                <li><Link href="/practice-test" className="hover:text-primary transition-colors">Practice Test</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/resources" className="hover:text-primary transition-colors">Study Materials</Link></li>
                <li><Link href="/analytics" className="hover:text-primary transition-colors">Analytics</Link></li>
                <li><Link href="/settings" className="hover:text-primary transition-colors">Settings</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/signup" className="hover:text-primary transition-colors">Sign Up</Link></li>
                <li><Link href="/login" className="hover:text-primary transition-colors">Sign In</Link></li>
                <li><Link href="/dashboard" className="hover:text-primary transition-colors">Dashboard</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} PrepMaster. All rights reserved.
            </p>
            <p className="text-sm font-medium text-primary">
              Powered by <span className="font-bold">BIG MACHINE ENT</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
