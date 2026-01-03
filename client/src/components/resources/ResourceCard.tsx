import { Resource, detectContentType } from "./types";
import { VideoCard } from "./VideoCard";
import { PDFCard } from "./PDFCard";
import { QuizCard } from "./QuizCard";
import { FlashcardCard } from "./FlashcardCard";
import { AudioCard } from "./AudioCard";
import { PracticeProblemCard } from "./PracticeProblemCard";
import { NoteCard } from "./NoteCard";
import { NoticeCard } from "./NoticeCard";
import { LinkCard } from "./LinkCard";

interface ResourceCardProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
  showActions?: boolean;
}

export function ResourceCard({ resource, onClick, className, showActions = true }: ResourceCardProps) {
  const contentType = detectContentType(resource);

  const cardProps = {
    resource,
    onClick,
    className,
    showActions,
  };

  switch (contentType) {
    case "notice":
      return <NoticeCard resource={resource} className={className} />;
    case "video":
      return <VideoCard {...cardProps} />;
    case "pdf":
      return <PDFCard {...cardProps} />;
    case "quiz":
      return <QuizCard {...cardProps} />;
    case "flashcard":
      return <FlashcardCard {...cardProps} />;
    case "audio":
      return <AudioCard {...cardProps} />;
    case "link":
      return <LinkCard {...cardProps} />;
    case "practice":
      return <PracticeProblemCard {...cardProps} />;
    case "note":
    default:
      return <NoteCard {...cardProps} />;
  }
}

