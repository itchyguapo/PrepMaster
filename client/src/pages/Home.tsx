import { Navbar } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Brain, Clock, BarChart, ShieldCheck } from "lucide-react";
import heroImage from "@assets/generated_images/students_studying_on_laptops_in_library.png";
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
                Practice with authentic past questions, get instant AI-powered explanations, and track your progress with smart analytics.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link href="/dashboard">
                  <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 transition-all hover:-translate-y-1">
                    Start Practicing Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-semibold border-2 hover:bg-accent hover:text-accent-foreground">
                  View Features
                </Button>
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
              <Card className="absolute -bottom-8 -left-8 w-64 shadow-xl border-primary/10 animate-bounce duration-[3000ms]">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xl">
                    A
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recent Score</p>
                    <p className="font-bold text-lg text-primary">Mathematics: 92%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-display font-bold">Everything you need to succeed</h2>
            <p className="text-lg text-muted-foreground">We don't just give you questions; we give you a complete learning system designed for the Nigerian curriculum.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Clock,
                title: "Realistic CBT Simulation",
                desc: "Practice under exam conditions with our precise timer and interface that mimics the actual WAEC/JAMB software."
              },
              {
                icon: BarChart,
                title: "Deep Performance Analytics",
                desc: "Identify your weak topics instantly. Our system analyzes every answer to tell you exactly where to focus."
              },
              {
                icon: ShieldCheck,
                title: "Verified Explanations",
                desc: "Don't just see the answer, understand the 'Why'. Detailed step-by-step solutions for every question."
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
    </div>
  );
}
