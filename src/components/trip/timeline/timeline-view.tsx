"use client";

import { useState, useMemo, useCallback } from "react";
import type { CardWithVoteStats, CardStage, Participant, Trip } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { CardItem } from "@/components/card/card-item";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Filter,
  Sparkles,
  Calendar,
  DollarSign,
  Car,
  Footprints,
  Bike,
  Train,
  Bus,
  Ship,
  Plane,
} from "lucide-react";
import type { TransportMode } from "@/types";

interface TimelineViewProps {
  trip: Trip;
  cards: CardWithVoteStats[];
  participants: Participant[];
  onCardClick: (card: CardWithVoteStats) => void;
  onAddCard: (date: string) => void;
  onReorderCards: (
    reordered: { id: string; sort_order: number; date?: string | null }[]
  ) => void;
  loading?: boolean;
}

const stageFilterOptions: { value: CardStage | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "idea", label: "Ideas" },
  { value: "hot_contender", label: "Hot Contenders" },
  { value: "chosen", label: "Chosen" },
  { value: "booked", label: "Booked" },
];

const transportIcons: Record<TransportMode, React.ComponentType<{ className?: string }>> = {
  walk: Footprints,
  drive: Car,
  bike: Bike,
  train: Train,
  bus: Bus,
  boat: Ship,
  plane: Plane,
  other: Car,
};

function TravelTimeIndicator({
  mode,
  durationMinutes,
}: {
  mode?: TransportMode;
  durationMinutes?: number;
}) {
  const Icon = transportIcons[mode ?? "drive"];
  const label = durationMinutes
    ? `~${durationMinutes} min ${mode ?? "drive"}`
    : "~15 min drive";

  return (
    <div className="flex items-center gap-2 py-1 px-4">
      <div className="flex-1 border-t border-dashed border-gray-300" />
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span>{label}</span>
      </div>
      <div className="flex-1 border-t border-dashed border-gray-300" />
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-lg border-2 border-gray-200 p-3 space-y-2">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

export function TimelineView({
  trip,
  cards,
  participants,
  onCardClick,
  onAddCard,
  onReorderCards,
  loading = false,
}: TimelineViewProps) {
  const [stageFilter, setStageFilter] = useState<CardStage | "all">("all");
  const [participantFilter, setParticipantFilter] = useState<string>("all");

  // Generate array of dates from trip start to end
  const tripDates = useMemo(() => {
    try {
      const start = parseISO(trip.start_date);
      const end = parseISO(trip.end_date);
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [trip.start_date, trip.end_date]);

  // Filter cards based on active filters
  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      if (stageFilter !== "all" && card.stage !== stageFilter) {
        return false;
      }
      if (participantFilter !== "all" && card.created_by !== participantFilter) {
        return false;
      }
      return true;
    });
  }, [cards, stageFilter, participantFilter]);

  // Group cards by date
  const cardsByDate = useMemo(() => {
    const grouped: Record<string, CardWithVoteStats[]> = {};

    // Initialize all trip dates with empty arrays
    for (const date of tripDates) {
      const dateStr = format(date, "yyyy-MM-dd");
      grouped[dateStr] = [];
    }

    // Add unscheduled bucket
    grouped["unscheduled"] = [];

    // Sort cards into buckets
    for (const card of filteredCards) {
      if (!card.date) {
        grouped["unscheduled"].push(card);
      } else {
        const cardDateStr = card.date;
        if (grouped[cardDateStr]) {
          grouped[cardDateStr].push(card);
        } else {
          // Card date outside trip range -- still show it under the nearest date bucket
          grouped[cardDateStr] = [card];
        }
      }
    }

    // Sort each day's cards by sort_order
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.sort_order - b.sort_order);
    }

    return grouped;
  }, [filteredCards, tripDates]);

  // Calculate daily budget totals
  const dailyBudgets = useMemo(() => {
    const budgets: Record<string, number> = {};
    for (const [dateKey, dayCards] of Object.entries(cardsByDate)) {
      budgets[dateKey] = dayCards.reduce((sum, card) => sum + card.budget, 0);
    }
    return budgets;
  }, [cardsByDate]);

  // All accordion values expanded by default
  const defaultAccordionValues = useMemo(() => {
    const values = tripDates.map((date) => format(date, "yyyy-MM-dd"));
    values.push("unscheduled");
    return values;
  }, [tripDates]);

  // Handle drag and drop
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) return;

      // Same position, no change
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const sourceDateKey = source.droppableId;
      const destDateKey = destination.droppableId;

      // Build the full list of cards in the destination droppable
      const destCards = [...(cardsByDate[destDateKey] ?? [])];
      const sourceCards =
        sourceDateKey === destDateKey
          ? destCards
          : [...(cardsByDate[sourceDateKey] ?? [])];

      // Find the dragged card
      const draggedCard = sourceCards.find((c) => c.id === draggableId);
      if (!draggedCard) return;

      // Remove from source
      if (sourceDateKey === destDateKey) {
        destCards.splice(source.index, 1);
        destCards.splice(destination.index, 0, draggedCard);
      } else {
        sourceCards.splice(source.index, 1);
        destCards.splice(destination.index, 0, draggedCard);
      }

      // Build reorder payload for the destination list
      const reordered: { id: string; sort_order: number; date?: string | null }[] =
        destCards.map((card, index) => ({
          id: card.id,
          sort_order: index * 100,
          ...(sourceDateKey !== destDateKey && card.id === draggableId
            ? { date: destDateKey === "unscheduled" ? null : destDateKey }
            : {}),
        }));

      // If cross-day move, also update source list sort orders
      if (sourceDateKey !== destDateKey) {
        sourceCards.forEach((card, index) => {
          reordered.push({
            id: card.id,
            sort_order: index * 100,
          });
        });
      }

      onReorderCards(reordered);
    },
    [cardsByDate, onReorderCards]
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton filter bar */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-20" />
          <div className="flex-1" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-28" />
        </div>

        {/* Skeleton day sections */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-10 rounded-full" />
              <Skeleton className="h-5 w-20" />
            </div>
            <div className="space-y-2 pl-2">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state (no cards at all)
  const totalCards = cards.length;
  const hasNoCards = totalCards === 0;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />

        {/* Stage filter buttons */}
        {stageFilterOptions.map((option) => (
          <Button
            key={option.value}
            variant={stageFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter(option.value)}
            className="text-xs"
          >
            {option.label}
          </Button>
        ))}

        <div className="w-px h-6 bg-border mx-1" />

        {/* Participant filter */}
        <Select
          value={participantFilter}
          onValueChange={setParticipantFilter}
        >
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filter by participant" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Participants</SelectItem>
            {participants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.first_name} {p.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* AI fill gaps button */}
        {/* TODO Phase 2: AI-powered suggestions */}
        <Button
          variant="outline"
          size="sm"
          disabled
          title="AI-powered suggestions coming in Phase 2"
          className="text-xs gap-1.5"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Fill Gaps
        </Button>
      </div>

      {/* Empty state */}
      {hasNoCards && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-sm">
            No activities planned yet. Click &apos;+ Add Card&apos; to start
            planning!
          </p>
        </div>
      )}

      {/* Day-by-day accordion */}
      {!hasNoCards && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Accordion
            type="multiple"
            defaultValue={defaultAccordionValues}
            className="space-y-2"
          >
            {/* Trip date sections */}
            {tripDates.map((date) => {
              const dateStr = format(date, "yyyy-MM-dd");
              const dayCards = cardsByDate[dateStr] ?? [];
              const dayBudget = dailyBudgets[dateStr] ?? 0;

              return (
                <AccordionItem
                  key={dateStr}
                  value={dateStr}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        {format(date, "EEEE, MMM d")}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {dayCards.length}{" "}
                        {dayCards.length === 1 ? "card" : "cards"}
                      </Badge>
                      {dayBudget > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3" />
                          {dayBudget.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Droppable droppableId={dateStr}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`min-h-[40px] rounded-md transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-accent/50"
                              : "bg-transparent"
                          }`}
                        >
                          {dayCards.length === 0 && !snapshot.isDraggingOver && (
                            <p className="text-xs text-muted-foreground text-center py-4">
                              No cards for this day. Drag cards here or add a
                              new one.
                            </p>
                          )}

                          {dayCards.map((card, index) => (
                            <Draggable
                              key={card.id}
                              draggableId={card.id}
                              index={index}
                            >
                              {(draggableProvided, draggableSnapshot) => (
                                <div>
                                  {/* Travel time indicator between cards */}
                                  {index > 0 && (
                                    <TravelTimeIndicator
                                      mode={undefined}
                                      durationMinutes={undefined}
                                    />
                                  )}
                                  <div
                                    ref={draggableProvided.innerRef}
                                    {...draggableProvided.draggableProps}
                                    className="mb-1"
                                  >
                                    <CardItem
                                      card={card}
                                      onClick={() => onCardClick(card)}
                                      isDragging={
                                        draggableSnapshot.isDragging
                                      }
                                      dragHandleProps={
                                        draggableProvided.dragHandleProps as unknown as Record<
                                          string,
                                          unknown
                                        >
                                      }
                                      totalParticipants={participants.length}
                                    />
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}

                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* Add card button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-gray-300 hover:border-gray-400"
                      onClick={() => onAddCard(dateStr)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add Card
                    </Button>
                  </AccordionContent>
                </AccordionItem>
              );
            })}

            {/* Unscheduled section */}
            <AccordionItem
              value="unscheduled"
              className="border rounded-lg px-4 border-dashed"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground opacity-50" />
                  <span className="font-semibold text-sm text-muted-foreground">
                    Unscheduled
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {(cardsByDate["unscheduled"] ?? []).length}{" "}
                    {(cardsByDate["unscheduled"] ?? []).length === 1
                      ? "card"
                      : "cards"}
                  </Badge>
                  {(dailyBudgets["unscheduled"] ?? 0) > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      <DollarSign className="h-3 w-3" />
                      {(dailyBudgets["unscheduled"] ?? 0).toLocaleString()}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Droppable droppableId="unscheduled">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[40px] rounded-md transition-colors ${
                        snapshot.isDraggingOver
                          ? "bg-accent/50"
                          : "bg-transparent"
                      }`}
                    >
                      {(cardsByDate["unscheduled"] ?? []).length === 0 &&
                        !snapshot.isDraggingOver && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Drag cards here to unschedule them, or add new ideas.
                          </p>
                        )}

                      {(cardsByDate["unscheduled"] ?? []).map((card, index) => (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              className="mb-1"
                            >
                              <CardItem
                                card={card}
                                onClick={() => onCardClick(card)}
                                isDragging={draggableSnapshot.isDragging}
                                dragHandleProps={
                                  draggableProvided.dragHandleProps as unknown as Record<
                                    string,
                                    unknown
                                  >
                                }
                                totalParticipants={participants.length}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                {/* Add card button for unscheduled */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground border border-dashed border-gray-300 hover:border-gray-400"
                  onClick={() => onAddCard("unscheduled")}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Add Card
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </DragDropContext>
      )}
    </div>
  );
}
