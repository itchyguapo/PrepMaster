import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Share2, 
  RotateCcw,
  ArrowRight,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Results() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 text-sm px-4 py-1">Exam Completed</Badge>
          <h1 className="text-4xl font-display font-bold">Great Job, Chidimma! 🎉</h1>
          <p className="text-muted-foreground text-lg">You've completed the JAMB Mathematics 2024 Practice Test.</p>
        </div>

        {/* Score Card */}
        <Card className="border-t-4 border-t-primary shadow-lg">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Score</p>
                <div className="flex items-baseline gap-2 justify-center md:justify-start">
                  <span className="text-6xl font-bold font-display text-primary">72</span>
                  <span className="text-2xl text-muted-foreground font-medium">/ 100</span>
                </div>
                <p className="text-sm font-medium text-green-600 flex items-center justify-center md:justify-start gap-1">
                  <span className="bg-green-100 px-2 py-0.5 rounded-full">+12%</span> better than last time
                </p>
              </div>

              <div className="flex gap-8 text-center">
                <div>
                  <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600 mx-auto mb-2">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold">43</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Correct</p>
                </div>
                <div>
                  <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-2">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Wrong</p>
                </div>
                <div>
                  <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mx-auto mb-2">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <p className="text-2xl font-bold">5</p>
                  <p className="text-xs text-muted-foreground font-medium uppercase">Skipped</p>
                </div>
              </div>
            </div>

            <Separator className="my-8" />

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Time Taken</span>
                  <span className="font-bold">45m 12s</span>
                </div>
                <Progress value={75} className="h-2" />
                <p className="text-xs text-muted-foreground">Avg. 45s per question</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Topic Mastery</span>
                  <span className="font-bold">Good</span>
                </div>
                <Progress value={65} className="h-2 bg-secondary/20" indicatorClassName="bg-secondary" />
                <p className="text-xs text-muted-foreground">Strong in Algebra, Weak in Geometry</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Accuracy</span>
                  <span className="font-bold">78%</span>
                </div>
                <Progress value={78} className="h-2 bg-primary/20" indicatorClassName="bg-primary" />
                <p className="text-xs text-muted-foreground">Top 15% of students</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/exam">
            <Button size="lg" className="h-12 px-8 bg-primary hover:bg-primary/90 text-lg">
              <RotateCcw className="mr-2 h-4 w-4" /> Retake Test
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
              Back to Dashboard
            </Button>
          </Link>
          <Button size="lg" variant="secondary" className="h-12 px-8 text-lg">
            <Share2 className="mr-2 h-4 w-4" /> Share Result
          </Button>
        </div>

        {/* Detailed Analysis */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold">Detailed Analysis</h2>
          <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {[
                  {
                    id: 1,
                    q: "Find the quadratic equation whose roots are -2/3 and 4.",
                    yourAnswer: "3x² - 10x - 8 = 0 (Correct)",
                    correct: true,
                    explanation: "Sum of roots = -2/3 + 4 = 10/3. Product of roots = -8/3. Equation: x² - (sum)x + (product) = 0 => x² - 10/3x - 8/3 = 0. Multiply by 3: 3x² - 10x - 8 = 0."
                  },
                  {
                    id: 2,
                    q: "Which of the following is NOT a property of sound waves?",
                    yourAnswer: "Polarization (Correct)",
                    correct: true,
                    explanation: "Sound waves are longitudinal waves and cannot be polarized. Only transverse waves (like light) can be polarized."
                  },
                  {
                    id: 3,
                    q: "The main function of the phloem in plants is to transport?",
                    yourAnswer: "Water (Incorrect)",
                    correctAnswer: "Manufactured food",
                    correct: false,
                    explanation: "Xylem transports water and mineral salts. Phloem transports manufactured food (translocation)."
                  }
                ].map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`} className="px-6 border-b last:border-0">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-start gap-4 text-left">
                        <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {item.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{item.q}</p>
                          <p className={`text-sm mt-1 ${item.correct ? 'text-green-600' : 'text-red-600'}`}>
                            Your Answer: {item.yourAnswer}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pl-14 pb-4">
                      <div className="bg-muted/30 p-4 rounded-lg space-y-2">
                        {!item.correct && (
                           <p className="text-sm font-semibold text-green-700">Correct Answer: {item.correctAnswer}</p>
                        )}
                        <p className="text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation:</span> {item.explanation}</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
