import { Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type StreakCounterProps = {
  currentStreak: number;
  longestStreak?: number;
  showLongest?: boolean;
};

export function StreakCounter({ currentStreak, longestStreak, showLongest = false }: StreakCounterProps) {
  if (currentStreak === 0 && !showLongest) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={currentStreak > 0 ? "default" : "secondary"}
        className={`gap-1.5 ${
          currentStreak > 0
            ? "bg-orange-500 hover:bg-orange-600 text-white"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {currentStreak > 0 && <Flame className="h-3.5 w-3.5" />}
        <span className="font-bold">{currentStreak}</span>
        <span className="text-xs font-normal">day streak</span>
      </Badge>
      {showLongest && longestStreak && longestStreak > currentStreak && (
        <span className="text-xs text-muted-foreground">
          Best: {longestStreak}
        </span>
      )}
    </div>
  );
}

