"use client";

import { format, parseISO, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Star,
  Calendar,
  DollarSign,
  MapPin,
  Home,
  Car,
  BedDouble,
} from "lucide-react";
import type { CardWithVoteStats, CardStage, Participant } from "@/types";

const stageLabels: Record<CardStage, string> = {
  idea: "Idea",
  hot_contender: "Hot Contender",
  chosen: "Chosen",
  booked: "Booked",
};

const stageBadgeStyles: Record<CardStage, string> = {
  idea: "bg-gray-100 text-gray-700 border-gray-300",
  hot_contender: "bg-yellow-50 text-yellow-800 border-yellow-400",
  chosen: "bg-green-50 text-green-800 border-green-400",
  booked: "bg-blue-50 text-blue-800 border-blue-400",
};

interface AccommodationsViewProps {
  cards: CardWithVoteStats[];
  participants: Participant[];
  onCardClick: (card: CardWithVoteStats) => void;
}

export function AccommodationsView({
  cards,
  participants,
  onCardClick,
}: AccommodationsViewProps) {
  const multiDayCards = cards.filter(
    (c) => c.is_multi_day || c.type === "lodging" || c.type === "rental"
  );

  const lodgingCards = multiDayCards.filter((c) => c.type === "lodging");
  const rentalCards = multiDayCards.filter((c) => c.type === "rental");
  const otherMultiDay = multiDayCards.filter(
    (c) => c.type !== "lodging" && c.type !== "rental"
  );

  const getDuration = (card: CardWithVoteStats) => {
    if (card.date && card.end_date) {
      return differenceInDays(parseISO(card.end_date), parseISO(card.date));
    }
    return 0;
  };

  const getDailyRate = (card: CardWithVoteStats) => {
    const days = getDuration(card);
    if (days > 0 && card.budget > 0) {
      return card.budget / days;
    }
    return null;
  };

  const renderCard = (card: CardWithVoteStats) => {
    const duration = getDuration(card);
    const dailyRate = getDailyRate(card);

    return (
      <Card
        key={card.id}
        className={`cursor-pointer hover:shadow-md transition-shadow border-2 ${stageBadgeStyles[card.stage]}`}
        onClick={() => onCardClick(card)}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h4 className="font-medium truncate">{card.title}</h4>
              {card.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  {card.location}
                </p>
              )}
            </div>
            <Badge variant="outline" className={`text-xs flex-shrink-0 ${stageBadgeStyles[card.stage]}`}>
              {stageLabels[card.stage]}
            </Badge>
          </div>

          {/* Date range */}
          {card.date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(parseISO(card.date), "MMM d")}
                {card.end_date && (
                  <> — {format(parseISO(card.end_date), "MMM d")}</>
                )}
              </span>
              {duration > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {duration} night{duration !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}

          {/* Budget */}
          <div className="flex items-center justify-between text-sm">
            {card.budget > 0 && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  ${card.budget.toLocaleString()}
                </span>
                {dailyRate && (
                  <span className="text-muted-foreground">
                    (${dailyRate.toFixed(0)}/night)
                  </span>
                )}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star
                className={`h-4 w-4 ${
                  card.avg_score && card.avg_score >= 2
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted-foreground"
                }`}
              />
              <span className="font-medium">
                {card.avg_score ? card.avg_score.toFixed(1) : "—"}
              </span>
              <span className="text-muted-foreground text-xs">
                ({card.vote_count}/{participants.length} voted)
              </span>
            </span>
          </div>

          {card.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {card.description}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSection = (
    title: string,
    icon: React.ReactNode,
    sectionCards: CardWithVoteStats[]
  ) => {
    if (sectionCards.length === 0) return null;
    return (
      <div className="space-y-3">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          {icon}
          {title}
          <Badge variant="secondary" className="text-xs">
            {sectionCards.length}
          </Badge>
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {sectionCards.map(renderCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Home className="h-5 w-5" />
          Accommodations & Rentals
        </h2>
      </div>

      {multiDayCards.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BedDouble className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No accommodations or rentals added yet.</p>
          <p className="text-sm mt-1">
            Create a card with type &quot;Lodging&quot; or &quot;Rental&quot; to see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection("Lodging", <BedDouble className="h-4 w-4" />, lodgingCards)}
          {renderSection("Rentals", <Car className="h-4 w-4" />, rentalCards)}
          {renderSection("Other Multi-Day", <Calendar className="h-4 w-4" />, otherMultiDay)}
        </div>
      )}
    </div>
  );
}
