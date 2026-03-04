"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCardIcon } from "@/lib/card-icons";
import type { CardWithVoteStats, Trip, CardStage } from "@/types";

// Time slots from 7:00 AM to 10:00 PM in 30-min increments
const SLOT_START_HOUR = 7;
const SLOT_END_HOUR = 22;
const SLOT_MINUTES = 30;
const TOTAL_SLOTS =
  ((SLOT_END_HOUR - SLOT_START_HOUR) * 60) / SLOT_MINUTES; // 30 slots
const SLOT_HEIGHT = 40; // px per slot

function timeSlotLabel(index: number): string {
  const totalMinutes = SLOT_START_HOUR * 60 + index * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  if (m === 0) return `${h12} ${ampm}`;
  return `${h12}:${String(m).padStart(2, "0")}`;
}

export function slotIndexToTime(index: number): string {
  const totalMinutes = SLOT_START_HOUR * 60 + index * SLOT_MINUTES;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function timeToSlotIndex(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes;
  const startMinutes = SLOT_START_HOUR * 60;
  return Math.max(
    0,
    Math.min(
      TOTAL_SLOTS - 1,
      Math.floor((totalMinutes - startMinutes) / SLOT_MINUTES)
    )
  );
}

function durationToSlots(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / SLOT_MINUTES));
}

const stageColors: Record<CardStage, string> = {
  idea: "border-l-gray-400 bg-gray-50",
  hot_contender: "border-l-yellow-400 bg-yellow-50",
  chosen: "border-l-green-400 bg-green-50",
  booked: "border-l-blue-400 bg-blue-50",
};

const MAX_VISIBLE_DAYS = 7;

interface CalendarScheduleProps {
  trip: Trip;
  cards: CardWithVoteStats[];
  onCardClick: (card: CardWithVoteStats) => void;
}

export function CalendarSchedule({
  trip,
  cards,
  onCardClick,
}: CalendarScheduleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const allDates = useMemo(() => {
    try {
      const start = parseISO(trip.start_date);
      const end = parseISO(trip.end_date);
      return eachDayOfInterval({ start, end });
    } catch {
      return [];
    }
  }, [trip.start_date, trip.end_date]);

  const needsPagination = allDates.length > MAX_VISIBLE_DAYS;
  const visibleDates = useMemo(() => {
    if (!needsPagination) return allDates;
    const start = weekOffset * MAX_VISIBLE_DAYS;
    return allDates.slice(start, start + MAX_VISIBLE_DAYS);
  }, [allDates, weekOffset, needsPagination]);

  const totalWeeks = Math.ceil(allDates.length / MAX_VISIBLE_DAYS);

  // Group scheduled cards by date
  const cardsByDate = useMemo(() => {
    const grouped: Record<string, CardWithVoteStats[]> = {};
    for (const date of allDates) {
      grouped[format(date, "yyyy-MM-dd")] = [];
    }
    for (const card of cards) {
      if (card.date && grouped[card.date]) {
        grouped[card.date].push(card);
      }
    }
    // Sort by start_time then sort_order
    for (const key of Object.keys(grouped)) {
      grouped[key].sort((a, b) => {
        if (a.start_time && b.start_time)
          return a.start_time.localeCompare(b.start_time);
        if (a.start_time) return -1;
        if (b.start_time) return 1;
        return a.sort_order - b.sort_order;
      });
    }
    return grouped;
  }, [cards, allDates]);

  // Scroll to current time on mount
  useEffect(() => {
    if (scrollRef.current) {
      const now = new Date();
      const currentHour = now.getHours();
      const scrollToSlot = Math.max(
        0,
        ((currentHour - SLOT_START_HOUR) * 60) / SLOT_MINUTES - 2
      );
      scrollRef.current.scrollTop = scrollToSlot * SLOT_HEIGHT;
    }
  }, []);

  const numCols = visibleDates.length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Calendar className="h-4 w-4" />
          Schedule
        </h3>
        {needsPagination && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={weekOffset === 0}
              onClick={() => setWeekOffset((w) => Math.max(0, w - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {weekOffset + 1}/{totalWeeks}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              disabled={weekOffset >= totalWeeks - 1}
              onClick={() =>
                setWeekOffset((w) => Math.min(totalWeeks - 1, w + 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Day headers */}
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `60px repeat(${numCols}, 1fr)`,
        }}
      >
        <div /> {/* empty corner */}
        {visibleDates.map((date) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayCards = cardsByDate[dateStr] ?? [];
          return (
            <div
              key={dateStr}
              className="text-center px-1 py-1.5 bg-muted/50 rounded-t-md"
            >
              <div className="text-[10px] text-muted-foreground uppercase">
                {format(date, "EEE")}
              </div>
              <div className="text-xs font-semibold">
                {format(date, "MMM d")}
              </div>
              {dayCards.length > 0 && (
                <Badge variant="secondary" className="text-[9px] mt-0.5">
                  {dayCards.length}
                </Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div
        ref={scrollRef}
        className="overflow-auto border rounded-md"
        style={{ maxHeight: "calc(100vh - 320px)" }}
      >
        <div
          className="grid gap-px relative"
          style={{
            gridTemplateColumns: `60px repeat(${numCols}, 1fr)`,
            gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${SLOT_HEIGHT}px)`,
          }}
        >
          {/* Time labels */}
          {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
            <div
              key={`time-${i}`}
              className="text-[10px] text-muted-foreground pr-2 text-right flex items-start justify-end pt-0.5 border-b border-r bg-muted/20"
              style={{
                gridRow: i + 1,
                gridColumn: 1,
              }}
            >
              {i % 2 === 0 ? timeSlotLabel(i) : ""}
            </div>
          ))}

          {/* Day columns - each is a droppable */}
          {visibleDates.map((date, colIndex) => {
            const dateStr = format(date, "yyyy-MM-dd");
            const dayCards = cardsByDate[dateStr] ?? [];

            return (
              <Droppable
                key={dateStr}
                droppableId={`calendar-${dateStr}`}
                direction="vertical"
              >
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "relative",
                      snapshot.isDraggingOver && "bg-primary/5"
                    )}
                    style={{
                      gridColumn: colIndex + 2,
                      gridRow: `1 / span ${TOTAL_SLOTS}`,
                    }}
                  >
                    {/* Grid lines for each slot */}
                    {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                      <div
                        key={`grid-${dateStr}-${i}`}
                        className={cn(
                          "border-b",
                          i % 2 === 0
                            ? "border-gray-200"
                            : "border-gray-100"
                        )}
                        style={{
                          position: "absolute",
                          top: i * SLOT_HEIGHT,
                          left: 0,
                          right: 0,
                          height: SLOT_HEIGHT,
                        }}
                      />
                    ))}

                    {/* Scheduled cards positioned by time */}
                    {dayCards.map((card, cardIndex) => {
                      const slotIndex = card.start_time
                        ? timeToSlotIndex(card.start_time)
                        : cardIndex * 2; // stack unpositioned cards
                      const slotSpan = durationToSlots(
                        card.duration_minutes || 60
                      );

                      return (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={cardIndex}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={cn(
                                "absolute left-0.5 right-0.5 rounded border-l-4 px-1.5 py-0.5 cursor-pointer hover:shadow-md transition-shadow overflow-hidden z-10",
                                stageColors[card.stage],
                                draggableSnapshot.isDragging &&
                                  "shadow-lg ring-2 ring-primary/20 z-20"
                              )}
                              style={{
                                ...draggableProvided.draggableProps.style,
                                ...(draggableSnapshot.isDragging
                                  ? {}
                                  : {
                                      top: slotIndex * SLOT_HEIGHT + 1,
                                      height:
                                        slotSpan * SLOT_HEIGHT - 2,
                                    }),
                              }}
                              onClick={() => onCardClick(card)}
                            >
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="text-xs flex-shrink-0">
                                  {getCardIcon(card.type, card.icon)}
                                </span>
                                <span className="text-[11px] font-medium truncate">
                                  {card.title}
                                </span>
                              </div>
                              {slotSpan > 1 && card.start_time && (
                                <div className="text-[9px] text-muted-foreground">
                                  {card.start_time.slice(0, 5)}
                                  {card.location && ` · ${card.location}`}
                                </div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}

                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </div>
    </div>
  );
}
