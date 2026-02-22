"use client";

import { useState, useMemo, useCallback } from "react";
import type { CardWithVoteStats, CardStage, Participant, Trip, CommuteSegment } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { CardItem } from "@/components/card/card-item";
import { CommuteSegmentIndicator } from "@/components/trip/commute/commute-segment-indicator";
import { CommuteEditor } from "@/components/trip/commute/commute-editor";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Filter,
  Sparkles,
  Calendar,
  DollarSign,
  Home,
} from "lucide-react";
import { isAccommodationType, getCardIcon } from "@/lib/card-icons";
import { recalculateStartTimes } from "@/lib/time-utils";

interface TimelineViewProps {
  trip: Trip;
  cards: CardWithVoteStats[];
  participants: Participant[];
  commuteSegments: CommuteSegment[];
  onCardClick: (card: CardWithVoteStats) => void;
  onAddCard: (date: string) => void;
  onReorderCards: (
    reordered: { id: string; sort_order: number; date?: string | null; start_time?: string }[]
  ) => void;
  onCreateOrUpdateSegment: (fromCardId: string, toCardId: string, breakMinutes?: number) => Promise<CommuteSegment | null>;
  onAddCommuteOption: (segmentId: string, data: { mode: string; label?: string; duration_minutes?: number; cost?: number; notes?: string; confirmation_number?: string; detail_fields?: Record<string, string> }) => Promise<void>;
  onUpdateCommuteOption: (optionId: string, data: Record<string, unknown>) => Promise<void>;
  onDeleteCommuteOption: (optionId: string) => Promise<void>;
  onAssignParticipant: (optionId: string, participantId: string) => Promise<void>;
  onRemoveParticipant: (optionId: string, participantId: string) => Promise<void>;
  onUpdateBreakTime: (segmentId: string, breakMinutes: number) => Promise<void>;
  loading?: boolean;
}

const stageFilterOptions: { value: CardStage | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "idea", label: "Ideas" },
  { value: "hot_contender", label: "Hot Contenders" },
  { value: "chosen", label: "Chosen" },
  { value: "booked", label: "Booked" },
];

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

// Rev 7: Lodging indicator in day header
function DayLodgingIndicator({
  lodgingCards,
  dateStr,
}: {
  lodgingCards: CardWithVoteStats[];
  dateStr: string;
}) {
  if (lodgingCards.length === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1 cursor-pointer">
            {lodgingCards.map((card) => (
              <span
                key={card.id}
                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-xs"
              >
                {getCardIcon(card.type, card.icon)}
              </span>
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs p-3 space-y-2">
          {lodgingCards.map((card) => {
            const isCheckIn = card.date === dateStr;
            const isCheckOut = card.end_date === dateStr;
            return (
              <div key={card.id} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span>{getCardIcon(card.type, card.icon)}</span>
                  <span className="font-medium text-sm">{card.title}</span>
                </div>
                {card.location && (
                  <p className="text-xs text-muted-foreground">{card.location}</p>
                )}
                {card.budget > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ${card.budget.toLocaleString()}
                    {card.date && card.end_date ? " total" : "/night"}
                  </p>
                )}
                <div className="flex gap-1">
                  {isCheckIn && (
                    <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700">
                      Check-in
                    </Badge>
                  )}
                  {isCheckOut && (
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700">
                      Check-out
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className="text-[10px]"
                  >
                    {card.stage}
                  </Badge>
                </div>
              </div>
            );
          })}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function TimelineView({
  trip,
  cards,
  participants,
  commuteSegments,
  onCardClick,
  onAddCard,
  onReorderCards,
  onCreateOrUpdateSegment,
  onAddCommuteOption,
  onUpdateCommuteOption,
  onDeleteCommuteOption,
  onAssignParticipant,
  onRemoveParticipant,
  onUpdateBreakTime: _onUpdateBreakTime,
  loading = false,
}: TimelineViewProps) {
  // onUpdateBreakTime is available via the commute editor's onSave
  void _onUpdateBreakTime;
  const [stageFilter, setStageFilter] = useState<CardStage | "all">("all");
  const [participantFilter, setParticipantFilter] = useState<string>("all");
  const [editingSegment, setEditingSegment] = useState<{
    segment: CommuteSegment | null;
    fromCard: CardWithVoteStats;
    toCard: CardWithVoteStats;
  } | null>(null);

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

  // Rev 7: Separate accommodation cards from activity cards
  const { activityCards, accommodationCards } = useMemo(() => {
    const activities: CardWithVoteStats[] = [];
    const accommodations: CardWithVoteStats[] = [];
    for (const card of filteredCards) {
      if (isAccommodationType(card.type)) {
        accommodations.push(card);
      } else {
        activities.push(card);
      }
    }
    return { activityCards: activities, accommodationCards: accommodations };
  }, [filteredCards]);

  // Group activity cards by date (excluding accommodation types)
  const cardsByDate = useMemo(() => {
    const grouped: Record<string, CardWithVoteStats[]> = {};

    for (const date of tripDates) {
      const dateStr = format(date, "yyyy-MM-dd");
      grouped[dateStr] = [];
    }
    grouped["unscheduled"] = [];

    for (const card of activityCards) {
      if (!card.date) {
        grouped["unscheduled"].push(card);
      } else {
        const cardDateStr = card.date;
        if (grouped[cardDateStr]) {
          grouped[cardDateStr].push(card);
        } else {
          grouped[cardDateStr] = [card];
        }
      }
    }

    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => a.sort_order - b.sort_order);
    }

    return grouped;
  }, [activityCards, tripDates]);

  // Rev 7: Compute lodging cards per day
  const lodgingByDate = useMemo(() => {
    const result: Record<string, CardWithVoteStats[]> = {};
    for (const date of tripDates) {
      const dateStr = format(date, "yyyy-MM-dd");
      result[dateStr] = accommodationCards.filter((card) => {
        if (!card.date) return false;
        const startDate = card.date;
        const endDate = card.end_date ?? card.date;
        return dateStr >= startDate && dateStr <= endDate;
      });
    }
    return result;
  }, [accommodationCards, tripDates]);

  // Build segment lookup for quick access
  const segmentLookup = useMemo(() => {
    const lookup: Record<string, CommuteSegment> = {};
    for (const seg of commuteSegments) {
      lookup[`${seg.from_card_id}-${seg.to_card_id}`] = seg;
    }
    return lookup;
  }, [commuteSegments]);

  const getSegmentBetween = useCallback(
    (fromCardId: string, toCardId: string): CommuteSegment | null => {
      return segmentLookup[`${fromCardId}-${toCardId}`] ?? null;
    },
    [segmentLookup]
  );

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

  // Rev 1: Handle drag and drop with auto time recalculation
  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;

      if (!destination) return;

      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      ) {
        return;
      }

      const sourceDateKey = source.droppableId;
      const destDateKey = destination.droppableId;

      const destCards = [...(cardsByDate[destDateKey] ?? [])];
      const sourceCards =
        sourceDateKey === destDateKey
          ? destCards
          : [...(cardsByDate[sourceDateKey] ?? [])];

      const draggedCard = sourceCards.find((c) => c.id === draggableId);
      if (!draggedCard) return;

      if (sourceDateKey === destDateKey) {
        destCards.splice(source.index, 1);
        destCards.splice(destination.index, 0, draggedCard);
      } else {
        sourceCards.splice(source.index, 1);
        destCards.splice(destination.index, 0, draggedCard);
      }

      // Rev 1: Recalculate start times for destination day
      const recalculated = destDateKey !== "unscheduled"
        ? recalculateStartTimes(destCards, commuteSegments)
        : [];

      const recalcMap = new Map(recalculated.map((r) => [r.id, r.start_time]));

      const reordered: { id: string; sort_order: number; date?: string | null; start_time?: string }[] =
        destCards.map((card, index) => ({
          id: card.id,
          sort_order: index * 100,
          ...(sourceDateKey !== destDateKey && card.id === draggableId
            ? { date: destDateKey === "unscheduled" ? null : destDateKey }
            : {}),
          ...(recalcMap.has(card.id) ? { start_time: recalcMap.get(card.id) } : {}),
        }));

      if (sourceDateKey !== destDateKey) {
        // Recalculate source day times too
        const sourceRecalc = sourceDateKey !== "unscheduled"
          ? recalculateStartTimes(sourceCards, commuteSegments)
          : [];
        const sourceRecalcMap = new Map(sourceRecalc.map((r) => [r.id, r.start_time]));

        sourceCards.forEach((card, index) => {
          reordered.push({
            id: card.id,
            sort_order: index * 100,
            ...(sourceRecalcMap.has(card.id) ? { start_time: sourceRecalcMap.get(card.id) } : {}),
          });
        });
      }

      onReorderCards(reordered);
    },
    [cardsByDate, onReorderCards, commuteSegments]
  );

  // Commute editor handlers
  const handleOpenCommuteEditor = useCallback(
    (fromCard: CardWithVoteStats, toCard: CardWithVoteStats) => {
      const segment = getSegmentBetween(fromCard.id, toCard.id);
      setEditingSegment({ segment, fromCard, toCard });
    },
    [getSegmentBetween]
  );

  const handleSaveSegment = useCallback(
    async (data: { breakMinutes: number }) => {
      if (!editingSegment) return;
      const { fromCard, toCard } = editingSegment;
      const segment = await onCreateOrUpdateSegment(fromCard.id, toCard.id, data.breakMinutes);
      if (segment) {
        setEditingSegment((prev) =>
          prev ? { ...prev, segment } : null
        );
      }
    },
    [editingSegment, onCreateOrUpdateSegment]
  );

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
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

  const totalCards = cards.length;
  const hasNoCards = totalCards === 0;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />

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
              const dayLodging = lodgingByDate[dateStr] ?? [];

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
                      {/* Rev 7: Lodging indicator */}
                      {dayLodging.length > 0 && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Home className="h-3.5 w-3.5 text-indigo-500" />
                          <DayLodgingIndicator lodgingCards={dayLodging} dateStr={dateStr} />
                        </div>
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
                                  {/* Rev 2/3: Commute segment indicator between cards */}
                                  {index > 0 && (
                                    <CommuteSegmentIndicator
                                      segment={getSegmentBetween(
                                        dayCards[index - 1].id,
                                        card.id
                                      )}
                                      onEdit={() =>
                                        handleOpenCommuteEditor(
                                          dayCards[index - 1],
                                          card
                                        )
                                      }
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

      {/* Commute Editor Dialog */}
      {editingSegment && (
        <CommuteEditor
          open={!!editingSegment}
          onOpenChange={(open) => {
            if (!open) setEditingSegment(null);
          }}
          segment={editingSegment.segment}
          fromCardTitle={editingSegment.fromCard.title}
          toCardTitle={editingSegment.toCard.title}
          participants={participants}
          onSave={handleSaveSegment}
          onAddOption={async (data) => {
            if (!editingSegment.segment) {
              // Create segment first
              const seg = await onCreateOrUpdateSegment(
                editingSegment.fromCard.id,
                editingSegment.toCard.id,
                0
              );
              if (seg) {
                await onAddCommuteOption(seg.id, data);
                setEditingSegment((prev) =>
                  prev ? { ...prev, segment: seg } : null
                );
              }
            } else {
              await onAddCommuteOption(editingSegment.segment.id, data);
            }
          }}
          onUpdateOption={async (optionId, data) => {
            await onUpdateCommuteOption(optionId, data);
          }}
          onDeleteOption={async (optionId) => {
            await onDeleteCommuteOption(optionId);
          }}
          onAssignParticipant={async (optionId, participantId) => {
            await onAssignParticipant(optionId, participantId);
          }}
          onRemoveParticipant={async (optionId, participantId) => {
            await onRemoveParticipant(optionId, participantId);
          }}
        />
      )}
    </div>
  );
}
