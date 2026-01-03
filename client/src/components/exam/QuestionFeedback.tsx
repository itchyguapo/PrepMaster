import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type QuestionFeedbackProps = {
  isCorrect: boolean;
  explanation?: string | null;
  correctAnswer: string;
  userAnswer: string;
  showNextButton?: boolean;
  onNext?: () => void;
  nextButtonText?: string;
};

export function QuestionFeedback({
  isCorrect,
  explanation,
  correctAnswer,
  userAnswer,
  showNextButton = false,
  onNext,
  nextButtonText = "Next Question",
}: QuestionFeedbackProps) {
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Feedback Header */}
      <div
        className={`p-4 rounded-lg border-2 ${
          isCorrect
            ? "bg-green-50 border-green-500 dark:bg-green-900/20 dark:border-green-500"
            : "bg-red-50 border-red-500 dark:bg-red-900/20 dark:border-red-500"
        }`}
      >
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg text-green-700 dark:text-green-300">Correct! 🎉</p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  Great job! You selected the correct answer.
                </p>
              </div>
            </>
          ) : (
            <>
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg text-red-700 dark:text-red-300">Incorrect</p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                  The correct answer is <span className="font-semibold">{correctAnswer}</span>
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Answer Details */}
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Your answer:</span>
          <span className={`font-semibold ${isCorrect ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
            {userAnswer}
          </span>
        </div>
        {!isCorrect && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Correct answer:</span>
            <span className="font-semibold text-green-700 dark:text-green-400">{correctAnswer}</span>
          </div>
        )}
      </div>

      {/* Explanation (Collapsible) */}
      {explanation && (
        <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between"
              onClick={() => setIsExplanationOpen(!isExplanationOpen)}
            >
              <span className="font-medium">
                {isExplanationOpen ? "Hide" : "Show"} Explanation
              </span>
              {isExplanationOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="p-4 bg-muted rounded-lg border border-border">
              <p className="text-sm leading-relaxed text-foreground">{explanation}</p>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Next Button */}
      {showNextButton && onNext && (
        <Button onClick={onNext} size="lg" className="w-full bg-primary hover:bg-primary/90">
          {nextButtonText}
        </Button>
      )}
    </div>
  );
}

