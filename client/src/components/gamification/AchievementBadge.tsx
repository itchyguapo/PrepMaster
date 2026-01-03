import { Trophy, Star, Target, Award, Zap, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AchievementBadgeProps = {
  achievement: string;
  size?: "sm" | "md" | "lg";
};

const achievementConfig: Record<string, { icon: typeof Trophy; label: string; description: string; color: string }> = {
  first_question: {
    icon: Star,
    label: "First Question",
    description: "Answered your first question",
    color: "bg-blue-500",
  },
  perfect_score: {
    icon: Trophy,
    label: "Perfect Score",
    description: "Scored 100% on a test",
    color: "bg-yellow-500",
  },
  week_warrior: {
    icon: Zap,
    label: "Week Warrior",
    description: "7-day practice streak",
    color: "bg-purple-500",
  },
  month_master: {
    icon: Crown,
    label: "Month Master",
    description: "30-day practice streak",
    color: "bg-orange-500",
  },
  century_club: {
    icon: Target,
    label: "Century Club",
    description: "Answered 100 questions",
    color: "bg-green-500",
  },
  accuracy_ace: {
    icon: Award,
    label: "Accuracy Ace",
    description: "90%+ accuracy rate",
    color: "bg-indigo-500",
  },
};

export function AchievementBadge({ achievement, size = "md" }: AchievementBadgeProps) {
  const config = achievementConfig[achievement];
  
  if (!config) {
    // Unknown achievement, show generic badge
    return (
      <Badge variant="secondary" className="gap-1">
        <Award className="h-3 w-3" />
        {achievement}
      </Badge>
    );
  }

  const Icon = config.icon;
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge className={`${config.color} text-white hover:opacity-90 gap-1.5 cursor-help`}>
            <Icon className={sizeClasses[size]} />
            <span className="text-xs font-medium">{config.label}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type AchievementListProps = {
  achievements: string[];
  maxDisplay?: number;
};

export function AchievementList({ achievements, maxDisplay = 5 }: AchievementListProps) {
  if (achievements.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No achievements yet. Keep practicing to unlock them!
      </div>
    );
  }

  const displayAchievements = achievements.slice(0, maxDisplay);
  const remaining = achievements.length - maxDisplay;

  return (
    <div className="flex flex-wrap gap-2">
      {displayAchievements.map((achievement, index) => (
        <AchievementBadge key={index} achievement={achievement} size="sm" />
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  );
}

