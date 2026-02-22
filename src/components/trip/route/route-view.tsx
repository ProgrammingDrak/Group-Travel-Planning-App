"use client";

import { useState, useEffect, useCallback } from "react";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Car,
  Footprints,
  Bike,
  Train,
  Bus,
  Ship,
  Plane,
  MoreHorizontal,
  Clock,
  AlertTriangle,
  MapPin,
  Navigation,
} from "lucide-react";
import type { Trip, CardWithVoteStats, TransportMode, TransportationOverride } from "@/types";

// TODO Phase 2: Google Maps API integration here

const modeIcons: Record<TransportMode, React.ReactNode> = {
  walk: <Footprints className="h-4 w-4" />,
  drive: <Car className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
  train: <Train className="h-4 w-4" />,
  bus: <Bus className="h-4 w-4" />,
  boat: <Ship className="h-4 w-4" />,
  plane: <Plane className="h-4 w-4" />,
  uber: <Car className="h-4 w-4" />,
  taxi: <Car className="h-4 w-4" />,
  other: <MoreHorizontal className="h-4 w-4" />,
};

const modeLabels: Record<TransportMode, string> = {
  walk: "Walk",
  drive: "Drive",
  bike: "Bike",
  train: "Train",
  bus: "Bus",
  boat: "Boat",
  plane: "Plane",
  uber: "Uber",
  taxi: "Taxi",
  other: "Other",
};

interface RouteViewProps {
  trip: Trip;
  cards: CardWithVoteStats[];
  tripId: string;
}

interface Conflict {
  type: "time_gap" | "overlap" | "late_arrival";
  message: string;
  cardIds: string[];
  dismissed?: boolean;
}

export function RouteView({ trip, cards }: RouteViewProps) {
  const [overrides, setOverrides] = useState<TransportationOverride[]>([]);
  const [editingSegment, setEditingSegment] = useState<{
    cardId: string;
    fromCardId: string;
  } | null>(null);
  const [editMode, setEditMode] = useState<TransportMode>("drive");
  const [editDuration, setEditDuration] = useState(15);
  const [editNotes, setEditNotes] = useState("");
  const [dismissedConflicts, setDismissedConflicts] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const fetchOverrides = useCallback(async () => {
    const { data } = await supabase
      .from("transportation_overrides")
      .select("*")
      .in(
        "card_id",
        cards.map((c) => c.id)
      );
    if (data) setOverrides(data);
  }, [cards, supabase]);

  useEffect(() => {
    if (cards.length > 0) fetchOverrides();
  }, [cards, fetchOverrides]);

  const days = trip.start_date && trip.end_date
    ? eachDayOfInterval({
        start: parseISO(trip.start_date),
        end: parseISO(trip.end_date),
      })
    : [];

  const scheduledCards = cards
    .filter((c) => c.date && c.start_time)
    .sort((a, b) => {
      if (a.date !== b.date) return (a.date || "").localeCompare(b.date || "");
      return (a.start_time || "").localeCompare(b.start_time || "");
    });

  const getCardsByDay = (dateStr: string) =>
    scheduledCards.filter((c) => c.date === dateStr);

  const getOverride = (cardId: string, fromCardId: string) =>
    overrides.find((o) => o.card_id === cardId && o.from_card_id === fromCardId);

  const getTransportDuration = (cardId: string, fromCardId: string) => {
    const override = getOverride(cardId, fromCardId);
    return override?.duration_minutes ?? 15;
  };

  const getTransportMode = (cardId: string, fromCardId: string): TransportMode => {
    const override = getOverride(cardId, fromCardId);
    return override?.mode ?? "drive";
  };

  const detectConflicts = (dayCards: CardWithVoteStats[]): Conflict[] => {
    const conflicts: Conflict[] = [];
    for (let i = 1; i < dayCards.length; i++) {
      const prev = dayCards[i - 1];
      const curr = dayCards[i];
      if (prev.start_time && curr.start_time) {
        const prevEnd =
          timeToMinutes(prev.start_time) + (prev.duration_minutes || 60);
        const currStart = timeToMinutes(curr.start_time);
        const travelTime = getTransportDuration(curr.id, prev.id);
        const gap = currStart - prevEnd;

        if (gap < 0) {
          conflicts.push({
            type: "overlap",
            message: `"${prev.title}" and "${curr.title}" overlap by ${Math.abs(gap)} minutes`,
            cardIds: [prev.id, curr.id],
          });
        } else if (gap < travelTime) {
          conflicts.push({
            type: "time_gap",
            message: `Only ${gap} minutes between "${prev.title}" and "${curr.title}" (need ${travelTime} min travel time)`,
            cardIds: [prev.id, curr.id],
          });
        }
      }
    }
    return conflicts;
  };

  const timeToMinutes = (time: string): number => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  const handleSaveTransport = async () => {
    if (!editingSegment) return;
    const existing = getOverride(editingSegment.cardId, editingSegment.fromCardId);
    if (existing) {
      await supabase
        .from("transportation_overrides")
        .update({
          mode: editMode,
          duration_minutes: editDuration,
          notes: editNotes,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("transportation_overrides").insert({
        card_id: editingSegment.cardId,
        from_card_id: editingSegment.fromCardId,
        mode: editMode,
        duration_minutes: editDuration,
        notes: editNotes,
      });
    }
    await fetchOverrides();
    setEditingSegment(null);
  };

  const openEditSegment = (cardId: string, fromCardId: string) => {
    const override = getOverride(cardId, fromCardId);
    setEditMode(override?.mode ?? "drive");
    setEditDuration(override?.duration_minutes ?? 15);
    setEditNotes(override?.notes ?? "");
    setEditingSegment({ cardId, fromCardId });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Navigation className="h-5 w-5" />
          Route Overview
        </h2>
        {/* TODO Phase 2: Google Maps API integration here */}
        <Button variant="outline" size="sm" disabled title="Coming in Phase 2">
          Optimize Route
        </Button>
      </div>

      {days.map((day) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const dayCards = getCardsByDay(dateStr);
        const conflicts = detectConflicts(dayCards);
        const totalTravel = dayCards.reduce((sum, c, i) => {
          if (i === 0) return 0;
          return sum + getTransportDuration(c.id, dayCards[i - 1].id);
        }, 0);

        if (dayCards.length === 0) return null;

        return (
          <div key={dateStr} className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">
                {format(day, "EEEE, MMM d")}
              </h3>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {totalTravel} min travel
              </Badge>
            </div>

            {/* Conflict warnings */}
            {conflicts
              .filter((c) => !dismissedConflicts.has(c.cardIds.join("-")))
              .map((conflict, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm"
                >
                  <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  <span className="flex-1 text-yellow-800">{conflict.message}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() =>
                      setDismissedConflicts((prev) => {
                        const next = new Set(Array.from(prev));
                        next.add(conflict.cardIds.join("-"));
                        return next;
                      })
                    }
                  >
                    Dismiss
                  </Button>
                </div>
              ))}

            {/* Route timeline */}
            <div className="relative ml-4 space-y-0">
              {dayCards.map((card, idx) => (
                <div key={card.id}>
                  {/* Card stop */}
                  <div className="flex items-start gap-3 py-2">
                    <div className="flex-shrink-0 mt-1">
                      <div className="h-3 w-3 rounded-full bg-primary border-2 border-background ring-2 ring-primary/20" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{card.title}</span>
                        {card.start_time && (
                          <Badge variant="secondary" className="text-xs">
                            {formatTime(card.start_time)}
                            {card.duration_minutes > 0 &&
                              ` - ${formatTime(
                                minutesToTime(
                                  timeToMinutes(card.start_time) + card.duration_minutes
                                )
                              )}`}
                          </Badge>
                        )}
                      </div>
                      {card.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {card.location}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Transport segment between cards */}
                  {idx < dayCards.length - 1 && (
                    <div
                      className="flex items-center gap-3 py-1 ml-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors"
                      onClick={() =>
                        openEditSegment(dayCards[idx + 1].id, card.id)
                      }
                    >
                      <div className="flex-shrink-0 flex flex-col items-center">
                        <div className="w-px h-2 bg-border" />
                        <div className="text-muted-foreground">
                          {modeIcons[getTransportMode(dayCards[idx + 1].id, card.id)]}
                        </div>
                        <div className="w-px h-2 bg-border" />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getTransportDuration(dayCards[idx + 1].id, card.id)} min{" "}
                        {modeLabels[getTransportMode(dayCards[idx + 1].id, card.id)].toLowerCase()}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <Separator />
          </div>
        );
      })}

      {scheduledCards.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Navigation className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No scheduled activities with times yet.</p>
          <p className="text-sm">
            Add times to your cards in the Timeline view to see the route.
          </p>
        </div>
      )}

      {/* Edit transport segment dialog */}
      <Dialog
        open={!!editingSegment}
        onOpenChange={() => setEditingSegment(null)}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Transportation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Mode of transport</Label>
              <Select
                value={editMode}
                onValueChange={(v) => setEditMode(v as TransportMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(modeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      <span className="flex items-center gap-2">
                        {modeIcons[key as TransportMode]}
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g., Take the subway Line 2"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingSegment(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveTransport}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}
