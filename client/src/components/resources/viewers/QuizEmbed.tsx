import { Resource } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";

interface QuizEmbedProps {
  resource: Resource;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export function QuizEmbed({ resource }: QuizEmbedProps) {
  // Parse quiz questions from content or metadata
  const questions: QuizQuestion[] = resource.metadata?.questions || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  // Timer effect
  useEffect(() => {
    if (!showResults) {
      const interval = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [showResults]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const score = showResults 
    ? Object.keys(answers).filter(i => answers[Number(i)] === questions[Number(i)]?.correctAnswer).length
    : 0;

  const handleAnswer = (answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [currentIndex]: answerIndex }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResults(true);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground">Quiz questions not available</p>
      </div>
    );
  }

  if (showResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Quiz Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-primary">
              {score} / {questions.length}
            </div>
            <div className="text-muted-foreground">
              {Math.round((score / questions.length) * 100)}% Correct
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Time: {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
            </div>
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => {
              const userAnswer = answers[i];
              const isCorrect = userAnswer === q.correctAnswer;
              return (
                <div key={i} className={`p-4 rounded-lg border-2 ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-red-500 bg-red-50 dark:bg-red-950/20'}`}>
                  <div className="font-semibold mb-2">{q.question}</div>
                  <div className="space-y-1">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className={`text-sm ${optIdx === q.correctAnswer ? 'text-green-700 dark:text-green-400 font-medium' : optIdx === userAnswer && !isCorrect ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
                        {optIdx === q.correctAnswer && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                        {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <strong>Explanation:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Question {currentIndex + 1} of {questions.length}</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-lg font-medium">{currentQuestion.question}</div>
        <RadioGroup value={answers[currentIndex]?.toString()} onValueChange={(v) => handleAnswer(Number(v))}>
          {currentQuestion.options.map((option, idx) => (
            <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
              <RadioGroupItem value={idx.toString()} id={`option-${idx}`} />
              <Label htmlFor={`option-${idx}`} className="flex-1 cursor-pointer">
                {option}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          <Button onClick={handleNext}>
            {currentIndex === questions.length - 1 ? "Submit Quiz" : "Next"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

