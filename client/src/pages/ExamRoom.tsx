import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Flag, 
  Calculator, 
  Grid,
  AlertCircle
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";

// Mock Data
const questions = [
  {
    id: 1,
    text: "Find the quadratic equation whose roots are -2/3 and 4.",
    options: [
      { id: "A", text: "3x² - 10x - 8 = 0" },
      { id: "B", text: "3x² - 14x - 8 = 0" },
      { id: "C", text: "3x² + 10x - 8 = 0" },
      { id: "D", text: "3x² + 14x - 8 = 0" },
    ],
    subject: "Mathematics",
    year: "2023"
  },
  {
    id: 2,
    text: "Which of the following is NOT a property of sound waves?",
    options: [
      { id: "A", text: "Diffraction" },
      { id: "B", text: "Polarization" },
      { id: "C", text: "Reflection" },
      { id: "D", text: "Refraction" },
    ],
    subject: "Physics",
    year: "2022"
  },
  {
    id: 3,
    text: "The main function of the phloem in plants is to transport?",
    options: [
      { id: "A", text: "Water" },
      { id: "B", text: "Mineral salts" },
      { id: "C", text: "Manufactured food" },
      { id: "D", text: "Hormones" },
    ],
    subject: "Biology",
    year: "2023"
  }
];

export default function ExamRoom() {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, setLocation] = useLocation();

  const currentQuestion = questions[currentQIndex];

  // Timer logic
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const calculateProgress = () => {
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / questions.length) * 100;
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setLocation("/dashboard"); // Redirect to dashboard or results
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      {/* Exam Header */}
      <header className="h-16 bg-white border-b border-border px-4 flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <h1 className="font-bold text-lg text-foreground">JAMB Mathematics 2024</h1>
            <p className="text-xs text-muted-foreground">Standard Mode • 60 Questions</p>
          </div>
          <div className="md:hidden">
            <h1 className="font-bold text-lg">Math 2024</h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-mono font-bold text-xl flex items-center gap-2 border border-primary/20">
            <Clock className="h-5 w-5 animate-pulse" />
            {formatTime(timeLeft)}
          </div>
          <Button variant="destructive" onClick={handleSubmit}>
            Submit Exam
          </Button>
        </div>
      </header>

      {/* Main Interface */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Question Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 max-w-5xl mx-auto w-full">
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Question {currentQIndex + 1} of {questions.length}</span>
              <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{currentQuestion.subject}</span>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Flag className="h-4 w-4 mr-2" /> Report Issue
            </Button>
          </div>

          <Card className="border-2 border-border/60 shadow-sm">
            <CardContent className="p-6 md:p-10">
              <p className="text-xl md:text-2xl font-medium leading-relaxed text-foreground mb-8">
                {currentQuestion.text}
              </p>

              <RadioGroup 
                value={answers[currentQuestion.id] || ""} 
                onValueChange={handleSelectOption}
                className="space-y-4"
              >
                {currentQuestion.options.map((option) => (
                  <div key={option.id} className={`flex items-center space-x-2 border rounded-xl p-4 transition-all cursor-pointer hover:bg-muted/50 ${answers[currentQuestion.id] === option.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border'}`}>
                    <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                    <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer font-normal text-lg ml-2">
                      <span className="font-bold mr-3">{option.id}.</span> {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          <div className="mt-8 flex items-center justify-between">
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="w-32"
            >
              <ChevronLeft className="mr-2 h-4 w-4" /> Previous
            </Button>

            <div className="hidden md:flex gap-2">
              {/* Pagination Dots */}
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${
                    idx === currentQIndex ? "bg-primary w-6" : 
                    answers[questions[idx].id] ? "bg-primary/40" : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>

            <Button 
              size="lg"
              className="bg-primary hover:bg-primary/90 w-32"
              onClick={() => setCurrentQIndex(prev => Math.min(questions.length - 1, prev + 1))}
              disabled={currentQIndex === questions.length - 1}
            >
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </main>

        {/* Sidebar / Tools */}
        <aside className="hidden lg:flex w-80 bg-muted/10 border-l border-border flex-col">
          <div className="p-6 border-b border-border">
            <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
              <Grid className="h-4 w-4" /> Question Map
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`h-10 w-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                    ${idx === currentQIndex ? "ring-2 ring-primary ring-offset-2 bg-background border border-primary" : ""}
                    ${answers[q.id] ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/50 text-muted-foreground"}
                  `}
                >
                  {idx + 1}
                </button>
              ))}
              {/* Mock filler questions to show grid */}
              {Array.from({ length: 17 }).map((_, i) => (
                 <button
                 key={i + 10}
                 className="h-10 w-10 rounded-lg text-sm font-medium bg-card border border-border text-muted-foreground/50 cursor-not-allowed"
               >
                 {i + 4}
               </button>
              ))}
            </div>
            
            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(calculateProgress())}%</span>
              </div>
              <Progress value={calculateProgress()} className="h-2" />
            </div>
          </div>

          <div className="p-6">
            <h3 className="font-bold text-foreground mb-4">Tools</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <Calculator className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs">Calculator</span>
              </Button>
              <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
                <AlertCircle className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs">Formulae</span>
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile Map Sheet */}
      <Sheet>
        <SheetTrigger asChild>
          <Button className="lg:hidden fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl z-50" size="icon">
            <Grid className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Question Map</SheetTitle>
          </SheetHeader>
          <div className="mt-6 grid grid-cols-5 gap-3">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQIndex(idx)}
                className={`h-10 w-10 rounded-lg text-sm font-medium transition-all flex items-center justify-center
                  ${idx === currentQIndex ? "ring-2 ring-primary ring-offset-2 bg-background border border-primary" : ""}
                  ${answers[q.id] ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:border-primary/50 text-muted-foreground"}
                `}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
