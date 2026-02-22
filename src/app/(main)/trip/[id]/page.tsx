"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useTrip } from "@/hooks/use-trip";
import { useCards } from "@/hooks/use-cards";
import { useRealtime } from "@/hooks/use-realtime";
import { useCommuteSegments } from "@/hooks/use-commute-segments";
import {
  ParticipantContext,
  getStoredParticipant,
  storeParticipant,
} from "@/hooks/use-participant";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { TimelineView } from "@/components/trip/timeline/timeline-view";
import { BudgetView } from "@/components/trip/budget/budget-view";
import { RouteView } from "@/components/trip/route/route-view";
import { ListView } from "@/components/trip/list/list-view";
import { AccommodationsView } from "@/components/trip/accommodations/accommodations-view";
import { CardModal } from "@/components/card/card-modal";
import { AddCardDialog } from "@/components/card/add-card-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Calendar,
  DollarSign,
  Navigation,
  List,
  Home,
  MapPin,
  Loader2,
  CalendarRange,
  AlertTriangle,
  Lock,
  ArrowRight,
} from "lucide-react";
import type { CardWithVoteStats, Card, ParticipantSession, CardType } from "@/types";

export default function TripPage() {
  const params = useParams();
  const tripId = params.id as string;

  // Trip and cards data
  const { trip, participants, loading: tripLoading, refetch: refetchTrip } = useTrip(tripId);
  const {
    cards,
    loading: cardsLoading,
    refetch: refetchCards,
    createCard,
    updateCard,
    deleteCard,
    reorderCards,
  } = useCards({ tripId });

  // Commute segments
  const {
    segments: commuteSegments,
    createOrUpdateSegment,
    addOption: addCommuteOption,
    updateOption: updateCommuteOption,
    deleteOption: deleteCommuteOption,
    assignParticipant: assignCommuteParticipant,
    removeParticipant: removeCommuteParticipant,
    updateBreakTime,
  } = useCommuteSegments(tripId);

  // Participant state
  const [participant, setParticipant] = useState<ParticipantSession | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinFirstName, setJoinFirstName] = useState("");
  const [joinLastName, setJoinLastName] = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joining, setJoining] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState("timeline");
  const [selectedCard, setSelectedCard] = useState<CardWithVoteStats | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [addCardDate, setAddCardDate] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showDateShift, setShowDateShift] = useState(false);
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [shifting, setShifting] = useState(false);

  // Load participant from localStorage
  useEffect(() => {
    const stored = getStoredParticipant(tripId);
    if (stored) {
      setParticipant(stored);
    } else {
      setShowJoinForm(true);
    }
  }, [tripId]);

  // Real-time subscriptions
  const handleCardsChange = useCallback(() => {
    refetchCards();
  }, [refetchCards]);

  const handleVotesChange = useCallback(() => {
    refetchCards();
  }, [refetchCards]);

  useRealtime({
    tripId,
    onCardsChange: handleCardsChange,
    onVotesChange: handleVotesChange,
    onCommentsChange: () => {},
    onParticipantsChange: refetchTrip,
  });

  // Unscheduled cards for library
  const libraryCards = useMemo(
    () => cards.filter((c) => !c.date),
    [cards]
  );

  // Handlers
  const handleCardClick = useCallback((card: CardWithVoteStats) => {
    setSelectedCard(card);
    setIsCardModalOpen(true);
  }, []);

  const handleAddCard = useCallback((date: string) => {
    setAddCardDate(date);
    setShowAddCard(true);
  }, []);

  const handleCreateCard = useCallback(
    async (data: {
      title: string;
      type: CardType;
      description: string;
      date: string | null;
      start_time: string | null;
      location: string;
      budget: number;
    }) => {
      await createCard({
        ...data,
        created_by: participant?.participant_id || null,
      });
    },
    [createCard, participant]
  );

  const handleUpdateCard = useCallback(
    async (updates: Partial<Card>) => {
      if (!selectedCard) return;
      await updateCard(selectedCard.id, updates);
      // Refresh the selected card data
      const updated = cards.find((c) => c.id === selectedCard.id);
      if (updated) setSelectedCard({ ...updated, ...updates } as CardWithVoteStats);
    },
    [selectedCard, updateCard, cards]
  );

  const handleDeleteCard = useCallback(async () => {
    if (!selectedCard) return;
    await deleteCard(selectedCard.id);
    setIsCardModalOpen(false);
    setSelectedCard(null);
  }, [selectedCard, deleteCard]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoining(true);
    try {
      const supabase = createClient();

      // Check if already exists
      const { data: existing } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", tripId)
        .eq("email", joinEmail)
        .single();

      if (existing) {
        const session: ParticipantSession = {
          participant_id: existing.id,
          trip_id: tripId,
          email: existing.email,
          first_name: existing.first_name,
          last_name: existing.last_name,
          is_organizer: existing.is_organizer,
        };
        storeParticipant(session);
        setParticipant(session);
        setShowJoinForm(false);
        refetchTrip();
        return;
      }

      const { data: newParticipant, error } = await supabase
        .from("participants")
        .insert({
          trip_id: tripId,
          first_name: joinFirstName,
          last_name: joinLastName,
          email: joinEmail,
        })
        .select()
        .single();

      if (error) throw error;

      const session: ParticipantSession = {
        participant_id: newParticipant.id,
        trip_id: tripId,
        email: newParticipant.email,
        first_name: newParticipant.first_name,
        last_name: newParticipant.last_name,
        is_organizer: false,
      };
      storeParticipant(session);
      setParticipant(session);
      setShowJoinForm(false);
      refetchTrip();
    } catch {
      // Error handling for duplicate
    } finally {
      setJoining(false);
    }
  };

  const handleDateShift = async () => {
    if (!newStartDate || !newEndDate) return;
    setShifting(true);
    try {
      await fetch(`/api/trips/${tripId}/shift-dates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_start_date: newStartDate,
          new_end_date: newEndDate,
        }),
      });
      await refetchTrip();
      await refetchCards();
      setShowDateShift(false);
    } finally {
      setShifting(false);
    }
  };

  const isOrganizer = participant?.is_organizer ?? false;

  // Loading state
  if (tripLoading) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-50 w-full border-b bg-background h-14 flex items-center px-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="container py-4 space-y-4">
          <Skeleton className="h-10 w-full max-w-lg" />
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-lg font-semibold">Trip not found</h2>
          <p className="text-muted-foreground mt-1">
            This trip may have been deleted or the link is invalid.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ParticipantContext.Provider
      value={{
        participant,
        setParticipant,
        isOrganizer,
      }}
    >
      <div className="min-h-screen bg-background">
        <Header
          trip={trip}
          onOpenLibrary={() => setShowLibrary(true)}
        />

        {/* Trip info bar */}
        <div className="border-b bg-muted/30">
          <div className="container py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{trip.destination}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(parseISO(trip.start_date), "MMM d")} —{" "}
              {format(parseISO(trip.end_date), "MMM d, yyyy")}
            </div>
            {Number(trip.total_budget) > 0 && (
              <Badge variant="secondary" className="text-xs">
                <DollarSign className="h-3 w-3 mr-0.5" />$
                {Number(trip.total_budget).toLocaleString()} budget
              </Badge>
            )}
            <div className="flex items-center gap-1 ml-auto">
              <div className="flex -space-x-2">
                {participants.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium border-2 border-background"
                    title={`${p.first_name} ${p.last_name}`}
                  >
                    {p.first_name[0]}
                    {p.last_name[0]}
                  </div>
                ))}
              </div>
              <span className="text-xs text-muted-foreground ml-2">
                {participants.length} member{participants.length !== 1 ? "s" : ""}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => {
                setNewStartDate(trip.start_date);
                setNewEndDate(trip.end_date);
                setShowDateShift(true);
              }}
            >
              <CalendarRange className="h-3 w-3 mr-1" />
              Move Dates
            </Button>
          </div>
        </div>

        {/* Main content with tabs */}
        <div className="container py-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="timeline" className="gap-1">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="budget" className="gap-1">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Budget</span>
              </TabsTrigger>
              <TabsTrigger value="route" className="gap-1">
                <Navigation className="h-4 w-4" />
                <span className="hidden sm:inline">Route</span>
              </TabsTrigger>
              <TabsTrigger value="list" className="gap-1">
                <List className="h-4 w-4" />
                <span className="hidden sm:inline">List</span>
              </TabsTrigger>
              <TabsTrigger value="accommodations" className="gap-1">
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Stays</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline">
              <TimelineView
                trip={trip}
                cards={cards}
                participants={participants}
                commuteSegments={commuteSegments}
                onCardClick={handleCardClick}
                onAddCard={handleAddCard}
                onReorderCards={reorderCards}
                onCreateOrUpdateSegment={createOrUpdateSegment}
                onAddCommuteOption={async (segmentId, data) => {
                  await addCommuteOption(segmentId, data.mode as import("@/types").TransportMode, data.duration_minutes ?? 15, {
                    label: data.label,
                    cost: data.cost,
                    notes: data.notes,
                    confirmationNumber: data.confirmation_number,
                    detailFields: data.detail_fields,
                  });
                }}
                onUpdateCommuteOption={async (optionId, data) => {
                  await updateCommuteOption(optionId, data as Record<string, unknown> & Parameters<typeof updateCommuteOption>[1]);
                }}
                onDeleteCommuteOption={deleteCommuteOption}
                onAssignParticipant={async (optionId, participantId) => {
                  await assignCommuteParticipant(optionId, participantId);
                }}
                onRemoveParticipant={removeCommuteParticipant}
                onUpdateBreakTime={updateBreakTime}
                loading={cardsLoading}
              />
            </TabsContent>

            <TabsContent value="budget">
              <BudgetView
                trip={trip}
                cards={cards}
                participants={participants}
                tripId={tripId}
              />
            </TabsContent>

            <TabsContent value="route">
              <RouteView trip={trip} cards={cards} tripId={tripId} />
            </TabsContent>

            <TabsContent value="list">
              <ListView
                cards={cards}
                participants={participants}
                onCardClick={handleCardClick}
                onDeleteCard={deleteCard}
              />
            </TabsContent>

            <TabsContent value="accommodations">
              <AccommodationsView
                cards={cards}
                participants={participants}
                onCardClick={handleCardClick}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Card Modal */}
        <CardModal
          card={selectedCard}
          isOpen={isCardModalOpen}
          onClose={() => {
            setIsCardModalOpen(false);
            setSelectedCard(null);
          }}
          onUpdate={handleUpdateCard}
          onDelete={handleDeleteCard}
          participants={participants}
          tripId={tripId}
        />

        {/* Add Card Dialog */}
        <AddCardDialog
          isOpen={showAddCard}
          onClose={() => {
            setShowAddCard(false);
            setAddCardDate(null);
          }}
          onSubmit={handleCreateCard}
          defaultDate={addCardDate}
          tripId={tripId}
        />

        {/* Activity Library Sheet */}
        <Sheet open={showLibrary} onOpenChange={setShowLibrary}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Activity Library</SheetTitle>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {libraryCards.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No unscheduled activities. Cards removed from the timeline will appear here.
                </p>
              ) : (
                libraryCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3 rounded-lg border space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">{card.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {card.type}
                      </Badge>
                    </div>
                    {card.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {card.location}
                      </p>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={() => {
                        handleCardClick(card);
                        setShowLibrary(false);
                      }}
                    >
                      View & Schedule
                    </Button>
                  </div>
                ))
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Date Shift Dialog */}
        <Dialog open={showDateShift} onOpenChange={setShowDateShift}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Move Trip Dates</DialogTitle>
              <DialogDescription>
                Shift all non-locked cards to new dates. Date-locked cards will remain unchanged.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium">Current dates:</p>
                <p className="text-muted-foreground">
                  {format(parseISO(trip.start_date), "EEEE, MMM d, yyyy")} —{" "}
                  {format(parseISO(trip.end_date), "EEEE, MMM d, yyyy")}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>New Start Date</Label>
                  <Input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>New End Date</Label>
                  <Input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={newStartDate}
                  />
                </div>
              </div>

              {/* Locked cards warning */}
              {cards.some((c) => c.is_date_locked) && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-800">
                      Date-locked cards won&apos;t move:
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {cards
                        .filter((c) => c.is_date_locked)
                        .map((c) => (
                          <li
                            key={c.id}
                            className="text-yellow-700 flex items-center gap-1"
                          >
                            <Lock className="h-3 w-3" />
                            {c.title}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDateShift(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleDateShift} disabled={shifting}>
                  {shifting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Shifting...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Shift Dates
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Join Form Dialog */}
        <Dialog open={showJoinForm && !participant} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-[400px]" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Welcome to {trip.name}</DialogTitle>
              <DialogDescription>
                Enter your details to join this trip and start planning.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="join-fn">First Name</Label>
                  <Input
                    id="join-fn"
                    value={joinFirstName}
                    onChange={(e) => setJoinFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="join-ln">Last Name</Label>
                  <Input
                    id="join-ln"
                    value={joinLastName}
                    onChange={(e) => setJoinLastName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-email">Email</Label>
                <Input
                  id="join-email"
                  type="email"
                  value={joinEmail}
                  onChange={(e) => setJoinEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={joining}>
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Join Trip"
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </ParticipantContext.Provider>
  );
}
