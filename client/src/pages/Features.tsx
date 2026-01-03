import { Navbar } from "@/components/layout/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, BarChart, ShieldCheck, BookOpen, Target, Zap, Download, Award, TrendingUp, FileText, Video, Smartphone, Users } from "lucide-react";
import { Link } from "wouter";

export default function Features() {
  const features = [
    {
      icon: Clock,
      title: "Realistic CBT Simulation",
      desc: "Practice under exam conditions with our precise timer and interface that mimics the actual WAEC/JAMB software.",
      category: "Practice"
    },
    {
      icon: BarChart,
      title: "Deep Performance Analytics",
      desc: "Identify your weak topics instantly. Our system analyzes every answer to tell you exactly where to focus.",
      category: "Analytics"
    },
    {
      icon: ShieldCheck,
      title: "Verified Explanations",
      desc: "Don't just see the answer, understand the 'Why'. Detailed step-by-step solutions for every question.",
      category: "Learning"
    },
    {
      icon: BookOpen,
      title: "Comprehensive Question Bank",
      desc: "Access thousands of authentic past questions from WAEC, NECO, and JAMB across all subjects and years.",
      category: "Content"
    },
    {
      icon: Target,
      title: "Randomized Practice Tests",
      desc: "Generate custom practice exams with randomized questions based on your selected exam body, category, and difficulty.",
      category: "Practice"
    },
    {
      icon: Zap,
      title: "Instant Results & Feedback",
      desc: "Get immediate feedback on your performance with detailed explanations and score breakdowns by subject.",
      category: "Feedback"
    },
    {
      icon: Download,
      title: "Offline Mode Support",
      desc: "Download questions and practice offline. Your progress syncs automatically when you're back online.",
      category: "Accessibility"
    },
    {
      icon: Award,
      title: "Progress Tracking",
      desc: "Track your improvement over time with visual analytics, performance trends, and personalized study recommendations.",
      category: "Analytics"
    },
    {
      icon: TrendingUp,
      title: "Subject Mastery Analysis",
      desc: "See which subjects you excel in and which need more practice with detailed topic-by-topic breakdowns.",
      category: "Analytics"
    },
    {
      icon: FileText,
      title: "Educational Resources",
      desc: "Access study notes, video tutorials, and learning materials to supplement your practice sessions.",
      category: "Learning"
    },
    {
      icon: Video,
      title: "Video Explanations",
      desc: "Watch step-by-step video solutions for complex problems to deepen your understanding.",
      category: "Learning"
    },
    {
      icon: Smartphone,
      title: "Mobile-Friendly Design",
      desc: "Practice anywhere, anytime with our responsive design that works perfectly on all devices.",
      category: "Accessibility"
    },
    {
      icon: Users,
      title: "Tutor Support",
      desc: "Connect with qualified tutors for personalized guidance and group study sessions.",
      category: "Support"
    }
  ];

  const categories = ["All", "Practice", "Analytics", "Learning", "Content", "Feedback", "Accessibility", "Support"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-32 pb-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h1 className="text-4xl md:text-5xl font-display font-bold">All Features</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover everything PrepMaster has to offer to help you excel in your exams.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            {features.map((feature, i) => (
              <Card key={i} className="border-border/50 hover:border-primary/50 transition-all hover:shadow-lg hover:-translate-y-1">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <feature.icon className="h-7 w-7" />
                    </div>
                    <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{feature.category}</span>
                  </div>
                  <h3 className="text-xl font-bold font-display">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Link href="/dashboard">
              <Button size="lg" className="h-14 px-8 text-lg font-semibold bg-primary hover:bg-primary/90">
                Start Using These Features
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

