"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getCardIcon, getCardTypeInfo } from "@/lib/card-icons";
import {
  MessageSquare,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Lock,
  GripVertical,
  CalendarCheck,
  AlertTriangle,
} from "lucide-react";
import type { CardWithVoteStats, CardStage } from "@/types";

const stageStyles: Record<CardStage, string> = {
  idea: "border-gray-300 bg-gray-50",
  hot_contender: "border-yellow-400 bg-yellow-50",
  chosen: "border-green-400 bg-green-50",
  booked: "border-blue-400 bg-blue-50",
};

const stageLabels: Record<CardStage, string> = {
  idea: "Idea",
  hot_contender: "Hot Contender",
  chosen: "Chosen",
  booked: "Booked",
};

const stageBadgeVariants: Record<CardStage, string> = {
  idea: "bg-gray-100 text-gray-700",
  hot_contender: "bg-yellow-100 text-yellow-800",
  chosen: "bg-green-100 text-green-800",
  booked: "bg-blue-100 text-blue-800",
};

// Helper to get vote count for a specific score tier
// Falls back to 0 if vote_counts not available
function getVoteCountForScore(card: CardWithVoteStats, score: number): number {
  if (card.vote_counts) {
    return card.vote_counts[score] ?? 0;
  }
  return 0;
}

interface CardItemProps {
  card: CardWithVoteStats;
  onClick?: () => void;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
  totalParticipants?: number;
  commentCount?: number;
  compact?: boolean;
}

export function CardItem({
  card,
  onClick,
  isDragging,
  dragHandleProps,
  totalParticipants = 5,
  commentCount = 0,
  compact = false,
}: CardItemProps) {
  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const emoji = getCardIcon(card.type, card.icon);
  const typeInfo = getCardTypeInfo(card.type);

  // Date availability check (Rev 6)
  const hasAvailabilityDates = card.available_dates && card.available_dates.length > 0;
  const isDateConflict =
    hasAvailabilityDates &&
    card.date &&
    !card.available_dates!.includes(card.date);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 rounded-lg border-2 p-3 transition-all cursor-pointer hover:shadow-md",
        stageStyles[card.stage],
        isDragging && "shadow-lg ring-2 ring-primary/20 rotate-1",
        isDateConflict && "ring-2 ring-orange-400",
        compact && "p-2"
      )}
      onClick={onClick}
    >
      {/* Drag handle */}
      {dragHandleProps && (
        <div
          {...dragHandleProps}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Card type emoji (Rev 5) */}
            <span className="text-base flex-shrink-0" title={typeInfo.label}>
              {emoji}
            </span>
            <h4 className="font-medium text-sm truncate">{card.title}</h4>
            {card.is_date_locked && (
              <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            )}
            {/* Date availability indicators (Rev 6) */}
            {hasAvailabilityDates && !isDateConflict && (
              <span className="flex-shrink-0" aria-label={`Available: ${card.available_dates!.join(", ")}`}>
                <CalendarCheck className="h-3 w-3 text-green-500" />
              </span>
            )}
            {isDateConflict && (
              <span className="flex-shrink-0" aria-label="Scheduled on unavailable date!">
                <AlertTriangle className="h-3 w-3 text-orange-500" />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Type badge with color (Rev 5) */}
            <Badge
              variant="outline"
              className={cn("text-[10px] px-1.5 py-0", typeInfo.color)}
            >
              {typeInfo.label}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-xs", stageBadgeVariants[card.stage])}
            >
              {stageLabels[card.stage]}
            </Badge>
          </div>
        </div>

        {/* Details row */}
        {!compact && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-muted-foreground">
            {card.start_time && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(card.start_time)}
                {card.duration_minutes > 0 && (
                  <span>({formatDuration(card.duration_minutes)})</span>
                )}
              </span>
            )}

            {card.location && (
              <span className="flex items-center gap-1 truncate max-w-[150px]">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                {card.location}
              </span>
            )}

            {card.budget > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {card.budget.toLocaleString()}
              </span>
            )}

            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {card.participant_count}
            </span>
          </div>
        )}

        {/* Stats row - Rev 4: Show vote tier counts */}
        <div className="flex items-center gap-2 mt-1.5 text-xs">
          {card.vote_count > 0 ? (
            <span className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Votes:</span>
              <span>👎{getVoteCountForScore(card, 1)}</span>
              <span>❌{getVoteCountForScore(card, 2)}</span>
              <span>➖{getVoteCountForScore(card, 3)}</span>
              <span>✅{getVoteCountForScore(card, 4)}</span>
              <span>🎉{getVoteCountForScore(card, 5)}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              {card.vote_count}/{totalParticipants} voted
            </span>
          )}

          {/* Comment count */}
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {commentCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
