import { Resource } from "../types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RotateCw, Shuffle, CheckCircle2, XCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface FlashcardStudyProps {
  resource: Resource;
}

export function FlashcardStudy({ resource }: FlashcardStudyProps) {
  // Parse flashcards from content or metadata
  const flashcards: Flashcard[] = resource.metadata?.flashcards || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<number>>(new Set());
  const [shuffled, setShuffled] = useState(false);

  const shuffledCards = useMemo(() => {
    if (!shuffled) return flashcards;
    const shuffledArray = [...flashcards];
    for (let i = shuffledArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledArray[i], shuffledArray[j]] = [shuffledArray[j], shuffledArray[i]];
    }
    return shuffledArray;
  }, [flashcards, shuffled]);

  const currentCard = shuffledCards[currentIndex];
  const progress = flashcards.length > 0 ? ((knownCards.size) / flashcards.length) * 100 : 0;
  const isKnown = knownCards.has(currentIndex);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleKnow = () => {
    setKnownCards(prev => {
      const newSet = new Set(prev);
      newSet.add(currentIndex);
      return newSet;
    });
    handleNext();
  };

  const handleDontKnow = () => {
    setKnownCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(currentIndex);
      return newSet;
    });
    handleNext();
  };

  const handleNext = () => {
    if (currentIndex < shuffledCards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setIsFlipped(false);
    }
  };

  const handleShuffle = () => {
    setShuffled(true);
    setCurrentIndex(0);
    setIsFlipped(false);
    setKnownCards(new Set());
  };

  if (flashcards.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground">Flashcards not available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Card {currentIndex + 1} of {flashcards.length}
          </span>
          <span className="font-medium">
            {knownCards.size} / {flashcards.length} mastered
          </span>
        </div>
        <Progress value={progress} />
      </div>

      {/* Flashcard */}
      <div className="relative h-96 perspective-1000">
        <Card 
          className={`absolute inset-0 cursor-pointer transition-transform duration-500 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
          onClick={handleFlip}
        >
          <CardContent className="h-full flex items-center justify-center p-8">
            {!isFlipped ? (
              <div className="text-center space-y-4">
                <div className="text-sm text-muted-foreground">Front</div>
                <div className="text-2xl font-semibold">{currentCard.front}</div>
                <div className="text-xs text-muted-foreground">Click to flip</div>
              </div>
            ) : (
              <div className="text-center space-y-4 rotate-y-180 backface-hidden">
                <div className="text-sm text-muted-foreground">Back</div>
                <div className="text-2xl font-semibold">{currentCard.back}</div>
                <div className="text-xs text-muted-foreground">Click to flip</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShuffle}>
            <Shuffle className="h-4 w-4 mr-2" />
            Shuffle
          </Button>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button 
            variant="outline" 
            onClick={handleNext}
            disabled={currentIndex === shuffledCards.length - 1}
          >
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Know/Don't Know Buttons */}
      {isFlipped && (
        <div className="flex gap-4 justify-center">
          <Button 
            variant="outline" 
            className="flex-1 border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
            onClick={handleDontKnow}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Don't Know
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 border-green-500 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
            onClick={handleKnow}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Know It
          </Button>
        </div>
      )}
    </div>
  );
}

