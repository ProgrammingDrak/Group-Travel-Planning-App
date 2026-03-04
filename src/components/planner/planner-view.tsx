"use client";

import { useMemo, useCallback, useState } from "react";
import {
  DragDropContext,
  type DropResult,
} from "@hello-pangea/dnd";
import { ActivityBank } from "./activity-bank";
import { CalendarSchedule, slotIndexToTime } from "./calendar-schedule";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Calendar } from "lucide-react";
import type {
  CardWithVoteStats,
  Card,
  Participant,
  Trip,
  CardType,
} from "@/types";

interface PlannerViewProps {
  trip: Trip;
  cards: CardWithVoteStats[];
  participants: Participant[];
  onCardClick: (card: CardWithVoteStats) => void;
  onReorderCards: (
    reordered: {
      id: string;
      sort_order: number;
      date?: string | null;
      start_time?: string | null;
    }[]
  ) => void;
  onCreateCard: (data: Partial<Card>) => Promise<unknown>;
  loading?: boolean;
}

export function PlannerView({
  trip,
  cards,
  participants,
  onCardClick,
  onReorderCards,
  onCreateCard,
  loading = false,
}: PlannerViewProps) {
  const [mobileTab, setMobileTab] = useState("bank");

  const unscheduledCards = useMemo(
    () => cards.filter((c) => !c.date),
    [cards]
  );

  const scheduledCards = useMemo(
    () => cards.filter((c) => c.date),
    [cards]
  );

  const handleCreateIdea = useCallback(
    async (data: {
      title: string;
      type: CardType;
      location: string;
      address: string;
      lat: number | null;
      lng: number | null;
    }) => {
      await onCreateCard({
        title: data.title,
        type: data.type,
        location: data.location,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        stage: "idea",
        date: null,
        start_time: null,
      });
    },
    [onCreateCard]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { source, destination, draggableId } = result;
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      const sourceIsBank = source.droppableId.startsWith("bank-");
      const destIsBank = destination.droppableId.startsWith("bank-");
      const destIsCalendar = destination.droppableId.startsWith("calendar-");
      const sourceIsCalendar = source.droppableId.startsWith("calendar-");

      if (sourceIsBank && destIsCalendar) {
        // Bank -> Calendar: schedule the card
        const targetDate = destination.droppableId.replace("calendar-", "");
        const startTime = slotIndexToTime(destination.index);

        onReorderCards([
          {
            id: draggableId,
            sort_order: destination.index * 100,
            date: targetDate,
            start_time: startTime,
          },
        ]);
      } else if (sourceIsCalendar && destIsBank) {
        // Calendar -> Bank: unschedule the card
        onReorderCards([
          {
            id: draggableId,
            sort_order: destination.index * 100,
            date: null,
            start_time: null,
          },
        ]);
      } else if (sourceIsCalendar && destIsCalendar) {
        // Calendar -> Calendar: move between days or within a day
        const targetDate = destination.droppableId.replace("calendar-", "");
        const startTime = slotIndexToTime(destination.index);

        onReorderCards([
          {
            id: draggableId,
            sort_order: destination.index * 100,
            date: targetDate,
            start_time: startTime,
          },
        ]);
      } else if (sourceIsBank && destIsBank) {
        // Bank -> Bank: just reorder (no date change)
        onReorderCards([
          {
            id: draggableId,
            sort_order: destination.index * 100,
          },
        ]);
      }
    },
    [onReorderCards]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
        Loading planner...
      </div>
    );
  }

  const bankPanel = (
    <ActivityBank
      cards={unscheduledCards}
      participants={participants}
      onCardClick={onCardClick}
      onCreateIdea={handleCreateIdea}
      trip={trip}
    />
  );

  const calendarPanel = (
    <CalendarSchedule
      trip={trip}
      cards={scheduledCards}
      onCardClick={onCardClick}
    />
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Desktop: side-by-side layout */}
      <div className="hidden md:flex gap-4 h-[calc(100vh-220px)]">
        <div className="w-[380px] flex-shrink-0 overflow-y-auto pr-3 border-r">
          {bankPanel}
        </div>
        <div className="flex-1 overflow-hidden">
          {calendarPanel}
        </div>
      </div>

      {/* Mobile: tab toggle */}
      <div className="md:hidden">
        <Tabs value={mobileTab} onValueChange={setMobileTab}>
          <TabsList className="w-full mb-3">
            <TabsTrigger value="bank" className="flex-1 gap-1">
              <MapPin className="h-3.5 w-3.5" />
              Bank ({unscheduledCards.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex-1 gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Schedule ({scheduledCards.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bank" className="max-h-[calc(100vh-280px)] overflow-y-auto">
            {bankPanel}
          </TabsContent>
          <TabsContent value="calendar" className="max-h-[calc(100vh-280px)] overflow-auto">
            {calendarPanel}
          </TabsContent>
        </Tabs>
      </div>
    </DragDropContext>
  );
}
