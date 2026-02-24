"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistanceToNow, format, parseISO, eachDayOfInterval } from "date-fns";
import {
  Trash2,
  Send,
  Pin,
  Reply,
  Upload,
  Lock,
  DollarSign,
  Users,
  MessageSquare,
  Receipt,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Info,
  ThumbsDown,
  Copy,
  Calendar,
  Loader2,
} from "lucide-react";

import type {
  Card,
  CardWithVoteStats,
  Participant,
  Vote as VoteType,
  Comment,
  Expense,
  CardStage,
  CardType,
  SplitType,
  CardParticipant,
  CommentReaction,
} from "@/types";
import { createClient } from "@/lib/supabase/client";
import { useParticipant } from "@/hooks/use-participant";
// card-icons used in CARD_TYPES and VOTE_TIERS constants above

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { DateTimePicker } from "@/components/ui/date-time-picker";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_TYPES: { value: CardType; label: string; emoji: string }[] = [
  { value: "activity", label: "Activity", emoji: "🎯" },
  { value: "restaurant", label: "Restaurant", emoji: "🍽️" },
  { value: "food", label: "Food", emoji: "🍕" },
  { value: "event", label: "Event", emoji: "🎫" },
  { value: "concert", label: "Concert", emoji: "🎵" },
  { value: "outdoor", label: "Outdoor", emoji: "🏕️" },
  { value: "lodging", label: "Lodging", emoji: "🏠" },
  { value: "rental", label: "Rental", emoji: "🚗" },
  { value: "flight", label: "Flight", emoji: "✈️" },
  { value: "shopping", label: "Shopping", emoji: "🛍️" },
  { value: "sightseeing", label: "Sightseeing", emoji: "📸" },
  { value: "nightlife", label: "Nightlife", emoji: "🌙" },
  { value: "spa", label: "Spa", emoji: "💆" },
  { value: "sports", label: "Sports", emoji: "⚽" },
  { value: "museum", label: "Museum", emoji: "🏛️" },
  { value: "beach", label: "Beach", emoji: "🏖️" },
];

// Rev 4: 5-tier voting system
const VOTE_TIERS = [
  { score: 1, emoji: "👎", label: "Hard Stop", description: "Hard stop, will not attend", color: "bg-red-100 text-red-700 border-red-300 hover:bg-red-200" },
  { score: 2, emoji: "❌", label: "Not Interested", description: "Not interested in going", color: "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200" },
  { score: 3, emoji: "➖", label: "Tag Along", description: "Not participating but will tag along", color: "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200" },
  { score: 4, emoji: "✅", label: "I'm In", description: "Sign me up, I'm in!", color: "bg-green-100 text-green-700 border-green-300 hover:bg-green-200" },
  { score: 5, emoji: "🎉", label: "Must Do!", description: "This will make or break my trip!", color: "bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200" },
];

const STAGE_OPTIONS: { value: CardStage; label: string; color: string }[] = [
  { value: "idea", label: "Idea", color: "text-gray-600" },
  { value: "hot_contender", label: "Hot Contender", color: "text-yellow-600" },
  { value: "chosen", label: "Chosen", color: "text-green-600" },
  { value: "booked", label: "Booked", color: "text-blue-600" },
];

const CATEGORY_SUGGESTIONS = [
  "Food",
  "Transport",
  "Entertainment",
  "Shopping",
  "Sightseeing",
  "Other",
];

const REACTION_EMOJIS = ["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F602}", "\u{1F389}", "\u{1F914}"];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CardModalProps {
  card: CardWithVoteStats | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updates: Partial<Card>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClone?: (cardData: Partial<Card>, dates: string[]) => Promise<void>;
  participants: Participant[];
  tripId: string;
  tripStartDate?: string;
  tripEndDate?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CardModal({
  card,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  onClone,
  participants,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  tripId,
  tripStartDate,
  tripEndDate,
}: CardModalProps) {
  const supabase = useMemo(() => createClient(), []);
  const { participant: currentParticipant, isOrganizer } = useParticipant();

  const [activeTab, setActiveTab] = useState("details");
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset tab when modal opens with a new card
  useEffect(() => {
    if (isOpen) {
      setActiveTab("details");
      setConfirmDelete(false);
    }
  }, [isOpen, card?.id]);

  const handleHeaderDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete) await onDelete();
  };

  if (!card) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setConfirmDelete(false); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-start justify-between gap-2">
            <DialogTitle className="text-xl">{card.title}</DialogTitle>
            {onDelete && (
              <Button
                variant={confirmDelete ? "destructive" : "ghost"}
                size="sm"
                className="shrink-0 mt-0.5"
                onClick={handleHeaderDelete}
                onBlur={() => setConfirmDelete(false)}
              >
                <Trash2 className="h-4 w-4" />
                {confirmDelete && <span className="ml-1.5">Confirm?</span>}
              </Button>
            )}
          </div>
          <DialogDescription className="sr-only">
            Card details for {card.title}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="mx-6 w-auto justify-start">
            <TabsTrigger value="details" className="gap-1.5">
              <Info className="h-3.5 w-3.5" />
              Details
            </TabsTrigger>
            <TabsTrigger value="voting" className="gap-1.5">
              <ThumbsDown className="h-3.5 w-3.5" />
              Voting
            </TabsTrigger>
            <TabsTrigger value="comments" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
            </TabsTrigger>
            <TabsTrigger value="participants" className="gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Participants
            </TabsTrigger>
            <TabsTrigger value="expenses" className="gap-1.5">
              <Receipt className="h-3.5 w-3.5" />
              Expenses
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-6 py-4">
              <TabsContent value="details" className="mt-0">
                <DetailsTab
                  card={card}
                  isOrganizer={isOrganizer}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onClone={onClone}
                  tripStartDate={tripStartDate}
                  tripEndDate={tripEndDate}
                />
              </TabsContent>

              <TabsContent value="voting" className="mt-0">
                <VotingTab
                  card={card}
                  supabase={supabase}
                  currentParticipant={currentParticipant}
                  participants={participants}
                />
              </TabsContent>

              <TabsContent value="comments" className="mt-0">
                <CommentsTab
                  card={card}
                  supabase={supabase}
                  currentParticipant={currentParticipant}
                  isOrganizer={isOrganizer}
                  participants={participants}
                />
              </TabsContent>

              <TabsContent value="participants" className="mt-0">
                <ParticipantsTab
                  card={card}
                  supabase={supabase}
                  participants={participants}
                />
              </TabsContent>

              <TabsContent value="expenses" className="mt-0">
                <ExpensesTab
                  card={card}
                  supabase={supabase}
                  participants={participants}
                  currentParticipant={currentParticipant}
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ===========================================================================
// DETAILS TAB
// ===========================================================================

interface DetailsTabProps {
  card: CardWithVoteStats;
  isOrganizer: boolean;
  onUpdate: (updates: Partial<Card>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClone?: (cardData: Partial<Card>, dates: string[]) => Promise<void>;
  tripStartDate?: string;
  tripEndDate?: string;
}

function DetailsTab({ card, isOrganizer, onUpdate, onDelete, onClone, tripStartDate, tripEndDate }: DetailsTabProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [date, setDate] = useState(card.date ?? "");
  const [startTime, setStartTime] = useState(card.start_time ?? "");
  const [durationMinutes, setDurationMinutes] = useState(card.duration_minutes);
  const [location, setLocation] = useState(card.location);
  const [address, setAddress] = useState(card.address);
  const [budget, setBudget] = useState(card.budget);
  const [category, setCategory] = useState(card.category);
  const [cardType, setCardType] = useState<CardType>(card.type);
  const [stage, setStage] = useState<CardStage>(card.stage);
  const [isDateLocked, setIsDateLocked] = useState(card.is_date_locked);
  const [isMultiDay, setIsMultiDay] = useState(card.is_multi_day);
  const [endDate, setEndDate] = useState(card.end_date ?? "");
  const [suggestedArrival, setSuggestedArrival] = useState(false);
  const [suggestedArrivalNotes, setSuggestedArrivalNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showClone, setShowClone] = useState(false);
  const [cloneDates, setCloneDates] = useState<Set<string>>(new Set());
  const [cloning, setCloning] = useState(false);

  // Generate trip days for clone selector
  const tripDays = useMemo(() => {
    if (!tripStartDate || !tripEndDate) return [];
    try {
      return eachDayOfInterval({
        start: parseISO(tripStartDate),
        end: parseISO(tripEndDate),
      }).map((d) => format(d, "yyyy-MM-dd"));
    } catch {
      return [];
    }
  }, [tripStartDate, tripEndDate]);

  // Reset form when card changes
  useEffect(() => {
    setTitle(card.title);
    setDescription(card.description);
    setDate(card.date ?? "");
    setStartTime(card.start_time ?? "");
    setDurationMinutes(card.duration_minutes);
    setLocation(card.location);
    setAddress(card.address);
    setBudget(card.budget);
    setCategory(card.category);
    setCardType(card.type);
    setStage(card.stage);
    setIsDateLocked(card.is_date_locked);
    setIsMultiDay(card.is_multi_day);
    setEndDate(card.end_date ?? "");
    setSuggestedArrival(false);
    setSuggestedArrivalNotes("");
    setConfirmDelete(false);
    setShowClone(false);
    setCloneDates(new Set());
    setCloning(false);
  }, [card]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // If suggested arrival notes were added, append to description
      let finalDescription = description;
      if (suggestedArrival && suggestedArrivalNotes.trim()) {
        const arrivalNote = `\n\n📍 Suggested Arrival Time Notes: ${suggestedArrivalNotes.trim()}`;
        if (!description.includes("Suggested Arrival Time Notes:")) {
          finalDescription = description + arrivalNote;
        }
      }

      await onUpdate({
        title,
        description: finalDescription,
        date: date || null,
        start_time: startTime || null,
        duration_minutes: durationMinutes,
        location,
        address,
        budget,
        category,
        type: cardType,
        stage,
        is_date_locked: isDateLocked,
        is_multi_day: isMultiDay,
        end_date: isMultiDay && endDate ? endDate : null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    if (onDelete) {
      await onDelete();
    }
  };

  const handleClone = async () => {
    if (!onClone || cloneDates.size === 0) return;
    setCloning(true);
    try {
      const cardData: Partial<Card> = {
        title: card.title,
        type: card.type,
        description: card.description,
        start_time: card.start_time,
        duration_minutes: card.duration_minutes,
        location: card.location,
        address: card.address,
        budget: card.budget,
        category: card.category,
        stage: card.stage,
        created_by: card.created_by,
      };
      await onClone(cardData, Array.from(cloneDates));
      setShowClone(false);
      setCloneDates(new Set());
    } finally {
      setCloning(false);
    }
  };

  const toggleCloneDate = (dateStr: string) => {
    setCloneDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateStr)) {
        next.delete(dateStr);
      } else {
        next.add(dateStr);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="card-title">Title</Label>
        <Input
          id="card-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Card title"
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="card-description">Description</Label>
        <Textarea
          id="card-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          rows={3}
        />
      </div>

      {/* Rev 6: Combined Date & Time picker */}
      <div className="grid grid-cols-2 gap-4">
        <DateTimePicker
          id="card-datetime"
          date={date}
          time={startTime}
          onDateChange={setDate}
          onTimeChange={setStartTime}
          suggestedArrival={suggestedArrival}
          onSuggestedArrivalChange={setSuggestedArrival}
          suggestedArrivalNotes={suggestedArrivalNotes}
          onSuggestedArrivalNotesChange={setSuggestedArrivalNotes}
        />
        <div className="space-y-2">
          <Label htmlFor="card-duration">Duration (min)</Label>
          <Input
            id="card-duration"
            type="number"
            min={0}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value))}
          />
        </div>
      </div>

      {/* Rev 7: Location with autocomplete */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Location</Label>
          <LocationAutocomplete
            value={location}
            onChange={setLocation}
            onSelect={(s) => {
              setLocation(s.name);
              setAddress(s.address);
            }}
            placeholder="Search for a location..."
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-address">Address</Label>
          <Input
            id="card-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Full address (auto-filled)"
          />
        </div>
      </div>

      {/* Budget & Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="card-budget">Budget</Label>
          <Input
            id="card-budget"
            type="number"
            min={0}
            step={0.01}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="card-category">Category</Label>
          <Input
            id="card-category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="e.g. Food, Transport..."
            list="category-suggestions"
          />
          <datalist id="category-suggestions">
            {CATEGORY_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      </div>

      {/* Type & Stage */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Card Type</Label>
          <Select
            value={cardType}
            onValueChange={(v) => setCardType(v as CardType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {CARD_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  <span className="flex items-center gap-1.5">
                    <span>{t.emoji}</span> {t.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isOrganizer && (
          <div className="space-y-2">
            <Label>Stage</Label>
            <Select
              value={stage}
              onValueChange={(v) => setStage(v as CardStage)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    <span className={s.color}>{s.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Toggles */}
      <div className="space-y-4">
        <TooltipProvider>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="date-lock-toggle" className="cursor-pointer">
                Date Lock
              </Label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Locked dates won&apos;t shift when trip dates change</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Switch
              id="date-lock-toggle"
              checked={isDateLocked}
              onCheckedChange={setIsDateLocked}
            />
          </div>
        </TooltipProvider>

        <div className="flex items-center justify-between">
          <Label htmlFor="multi-day-toggle" className="cursor-pointer">
            Multi-day
          </Label>
          <Switch
            id="multi-day-toggle"
            checked={isMultiDay}
            onCheckedChange={setIsMultiDay}
          />
        </div>

        {isMultiDay && (
          <div className="space-y-2">
            <Label htmlFor="card-end-date">End Date</Label>
            <Input
              id="card-end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        )}
      </div>

      <Separator />

      {/* Image upload placeholder */}
      <div className="space-y-2">
        <Label>Images</Label>
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <Upload className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">
              Drop images here or click to upload
            </p>
            {/* TODO Phase 2: Supabase Storage integration */}
          </div>
        </div>
      </div>

      <Separator />

      {/* Clone to Days */}
      {onClone && tripDays.length > 0 && (
        <>
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5"
              onClick={() => setShowClone(!showClone)}
            >
              <Copy className="h-4 w-4" />
              Clone to Other Days
            </Button>

            {showClone && (
              <div className="rounded-lg border p-3 space-y-3 bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  Select the days to copy this activity to. A duplicate card will be created on each selected day.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-[200px] overflow-y-auto">
                  {tripDays.map((dayStr) => {
                    const isCurrentDay = dayStr === card.date;
                    const isSelected = cloneDates.has(dayStr);
                    return (
                      <button
                        key={dayStr}
                        type="button"
                        disabled={isCurrentDay}
                        onClick={() => toggleCloneDate(dayStr)}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                          isCurrentDay
                            ? "opacity-40 cursor-not-allowed bg-muted"
                            : isSelected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-accent"
                        }`}
                      >
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span>{format(parseISO(dayStr), "EEE, MMM d")}</span>
                        {isCurrentDay && <span className="text-[10px]">(current)</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {cloneDates.size} day{cloneDates.size !== 1 ? "s" : ""} selected
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1"
                    onClick={handleClone}
                    disabled={cloneDates.size === 0 || cloning}
                  >
                    {cloning ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Cloning...
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Clone to {cloneDates.size} Day{cloneDates.size !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {confirmDelete ? "Confirm Delete" : "Delete Card"}
          </Button>
        )}
        {!onDelete && <div />}
        <Button onClick={handleSave} disabled={saving || !title.trim()}>
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// VOTING TAB
// ===========================================================================

interface VotingTabProps {
  card: CardWithVoteStats;
  supabase: ReturnType<typeof createClient>;
  currentParticipant: ReturnType<typeof useParticipant>["participant"];
  participants: Participant[];
}

function VotingTab({
  card,
  supabase,
  currentParticipant,
  participants,
}: VotingTabProps) {
  const [votes, setVotes] = useState<VoteType[]>([]);
  const [myScore, setMyScore] = useState<number | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchVotes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("votes")
        .select("*, participant:participants(*)")
        .eq("card_id", card.id);

      if (!error && data) {
        setVotes(data as VoteType[]);
        if (currentParticipant) {
          const myVote = data.find(
            (v: VoteType) => v.participant_id === currentParticipant.participant_id
          );
          if (myVote) {
            setMyScore(myVote.score);
            setIsAnonymous(myVote.is_anonymous);
          } else {
            setMyScore(null);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, card.id, currentParticipant]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const handleVote = async (score: number) => {
    if (!currentParticipant || submitting) return;

    const previousScore = myScore;
    const previousVotes = [...votes];

    // Optimistic update
    setMyScore(score);
    setVotes((prev) => {
      const existing = prev.findIndex(
        (v) => v.participant_id === currentParticipant.participant_id
      );
      const voteEntry: VoteType = {
        id: existing >= 0 ? prev[existing].id : "temp-" + Date.now(),
        card_id: card.id,
        participant_id: currentParticipant.participant_id,
        score,
        is_anonymous: isAnonymous,
        voted_at: new Date().toISOString(),
        participant: {
          id: currentParticipant.participant_id,
          trip_id: currentParticipant.trip_id,
          first_name: currentParticipant.first_name,
          last_name: currentParticipant.last_name,
          email: currentParticipant.email,
          is_organizer: currentParticipant.is_organizer,
          joined_at: "",
        },
      };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = voteEntry;
        return updated;
      }
      return [...prev, voteEntry];
    });

    setSubmitting(true);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          participant_id: currentParticipant.participant_id,
          score,
          is_anonymous: isAnonymous,
        }),
      });

      if (!response.ok) {
        setMyScore(previousScore);
        setVotes(previousVotes);
      }
    } catch {
      setMyScore(previousScore);
      setVotes(previousVotes);
    } finally {
      setSubmitting(false);
    }
  };

  // Rev 4: Count votes per tier
  const voteCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const v of votes) {
      if (counts[v.score] !== undefined) {
        counts[v.score]++;
      }
    }
    return counts;
  }, [votes]);

  const totalParticipants = participants.length;

  return (
    <div className="space-y-6">
      {/* Rev 4: 5-tier vote buttons */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Cast Your Vote</Label>
        <TooltipProvider>
          <div className="flex items-center gap-2">
            {VOTE_TIERS.map((tier) => (
              <Tooltip key={tier.score}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="lg"
                    className={`h-14 w-14 text-xl p-0 border-2 transition-all ${
                      myScore === tier.score
                        ? tier.color + " ring-2 ring-offset-1 ring-current font-bold"
                        : "hover:scale-105"
                    }`}
                    onClick={() => handleVote(tier.score)}
                    disabled={!currentParticipant || submitting}
                  >
                    {tier.emoji}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[200px]">
                  <p className="font-medium">{tier.label}</p>
                  <p className="text-xs text-muted-foreground">{tier.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
        <div className="flex items-center gap-2 mt-2">
          <Switch
            id="anonymous-vote"
            checked={isAnonymous}
            onCheckedChange={setIsAnonymous}
          />
          <Label htmlFor="anonymous-vote" className="text-sm cursor-pointer">
            Vote anonymously
          </Label>
        </div>
      </div>

      <Separator />

      {/* Rev 4: Vote counts per tier instead of average */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Vote Summary</Label>
          <span className="text-sm text-muted-foreground">
            {votes.length}/{totalParticipants} voted
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2">
          {VOTE_TIERS.map((tier) => (
            <div
              key={tier.score}
              className="flex flex-col items-center gap-1 rounded-lg border p-2"
            >
              <span className="text-lg">{tier.emoji}</span>
              <span className="text-xl font-bold">{voteCounts[tier.score]}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">
                {tier.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Individual votes list */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">All Votes</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading votes...</p>
        ) : votes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No votes yet. Be the first!</p>
        ) : (
          <div className="space-y-2">
            {votes.map((vote) => {
              const tier = VOTE_TIERS.find((t) => t.score === vote.score);
              return (
                <div
                  key={vote.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span className="text-sm font-medium">
                    {vote.is_anonymous
                      ? "Anonymous"
                      : vote.participant
                      ? `${vote.participant.first_name} ${vote.participant.last_name}`
                      : "Unknown"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{tier?.emoji ?? "?"}</span>
                    <span className="text-xs text-muted-foreground">
                      {tier?.label ?? "Unknown"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// COMMENTS TAB
// ===========================================================================

interface CommentsTabProps {
  card: CardWithVoteStats;
  supabase: ReturnType<typeof createClient>;
  currentParticipant: ReturnType<typeof useParticipant>["participant"];
  isOrganizer: boolean;
  participants: Participant[];
}

function CommentsTab({
  card,
  supabase,
  currentParticipant,
  isOrganizer,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  participants,
}: CommentsTabProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch top-level comments
      const { data: topLevel, error: topError } = await supabase
        .from("comments")
        .select("*, participant:participants(*), reactions:comment_reactions(*)")
        .eq("card_id", card.id)
        .is("parent_comment_id", null)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });

      if (topError || !topLevel) {
        setLoading(false);
        return;
      }

      // Fetch replies for these comments
      const topIds = topLevel.map((c: Comment) => c.id);
      let replies: Comment[] = [];
      if (topIds.length > 0) {
        const { data: replyData } = await supabase
          .from("comments")
          .select("*, participant:participants(*), reactions:comment_reactions(*)")
          .eq("card_id", card.id)
          .in("parent_comment_id", topIds)
          .order("created_at", { ascending: true });

        if (replyData) {
          replies = replyData as Comment[];
        }
      }

      // Nest replies into parent comments
      const commentsWithReplies = topLevel.map((c: Comment) => ({
        ...c,
        replies: replies.filter((r) => r.parent_comment_id === c.id),
      }));

      setComments(commentsWithReplies);
    } finally {
      setLoading(false);
    }
  }, [supabase, card.id]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmitComment = async (parentId: string | null = null) => {
    if (!currentParticipant || submitting) return;
    const content = parentId ? replyContent.trim() : newComment.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          participant_id: currentParticipant.participant_id,
          content,
          parent_comment_id: parentId,
        }),
      });

      if (response.ok) {
        if (parentId) {
          setReplyContent("");
          setReplyingTo(null);
        } else {
          setNewComment("");
        }
        await fetchComments();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!currentParticipant) return;
    try {
      await fetch(`/api/comments/${commentId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participant_id: currentParticipant.participant_id,
          emoji,
        }),
      });
      await fetchComments();
    } catch {
      // silently fail
    }
  };

  const handlePin = async (commentId: string, isPinned: boolean) => {
    try {
      await fetch(`/api/comments/${commentId}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !isPinned }),
      });
      await fetchComments();
    } catch {
      // silently fail
    }
  };

  const groupedReactions = (reactions: CommentReaction[] | undefined) => {
    if (!reactions || reactions.length === 0) return {};
    return reactions.reduce<Record<string, number>>((acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1;
      return acc;
    }, {});
  };

  const renderComment = (comment: Comment, isReply = false) => {
    const reactions = groupedReactions(comment.reactions);
    return (
      <div
        key={comment.id}
        className={`space-y-2 ${isReply ? "ml-8 border-l-2 pl-4" : ""}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {comment.participant
                  ? `${comment.participant.first_name} ${comment.participant.last_name}`
                  : "Unknown"}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.created_at), {
                  addSuffix: true,
                })}
              </span>
              {comment.is_pinned && (
                <Badge variant="secondary" className="text-xs py-0 px-1.5">
                  <Pin className="h-3 w-3 mr-0.5" />
                  Pinned
                </Badge>
              )}
            </div>
            <p className="text-sm mt-1 whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>

        {/* Reactions display */}
        {Object.keys(reactions).length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(reactions).map(([emoji, count]) => (
              <button
                key={emoji}
                onClick={() => handleReaction(comment.id, emoji)}
                className="inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-xs hover:bg-accent transition-colors"
              >
                <span>{emoji}</span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Reaction picker */}
          <div className="flex items-center gap-0.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(comment.id, emoji)}
                className="rounded p-1 text-sm hover:bg-accent transition-colors"
                title={`React with ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Reply button (only for top-level) */}
          {!isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() =>
                setReplyingTo(replyingTo === comment.id ? null : comment.id)
              }
            >
              <Reply className="h-3 w-3 mr-1" />
              Reply
            </Button>
          )}

          {/* Pin button (organizer only) */}
          {isOrganizer && !isReply && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handlePin(comment.id, comment.is_pinned)}
            >
              <Pin className="h-3 w-3 mr-1" />
              {comment.is_pinned ? "Unpin" : "Pin"}
            </Button>
          )}
        </div>

        {/* Reply form */}
        {replyingTo === comment.id && (
          <div className="ml-8 flex gap-2">
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              rows={2}
              className="flex-1 text-sm"
            />
            <Button
              size="sm"
              onClick={() => handleSubmitComment(comment.id)}
              disabled={!replyContent.trim() || submitting}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-3 mt-2">
            {comment.replies.map((reply) => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* New comment form */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Add a Comment</Label>
        <div className="flex gap-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share your thoughts..."
            rows={3}
            className="flex-1"
          />
          <div className="flex flex-col justify-end">
            <Button
              onClick={() => handleSubmitComment(null)}
              disabled={!newComment.trim() || submitting || !currentParticipant}
            >
              <Send className="h-4 w-4 mr-1.5" />
              Post
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Comments list */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No comments yet. Start the conversation!
          </p>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// PARTICIPANTS TAB
// ===========================================================================

interface ParticipantsTabProps {
  card: CardWithVoteStats;
  supabase: ReturnType<typeof createClient>;
  participants: Participant[];
}

function ParticipantsTab({
  card,
  supabase,
  participants,
}: ParticipantsTabProps) {
  const [cardParticipants, setCardParticipants] = useState<
    Record<string, boolean>
  >({});
  const [loading, setLoading] = useState(true);

  const fetchCardParticipants = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("card_participants")
        .select("*")
        .eq("card_id", card.id);

      if (!error && data) {
        const map: Record<string, boolean> = {};
        (data as CardParticipant[]).forEach((cp) => {
          map[cp.participant_id] = cp.is_participating;
        });
        setCardParticipants(map);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, card.id]);

  useEffect(() => {
    fetchCardParticipants();
  }, [fetchCardParticipants]);

  const handleToggle = async (participantId: string, checked: boolean) => {
    // Optimistic update
    setCardParticipants((prev) => ({ ...prev, [participantId]: checked }));

    try {
      const { error } = await supabase.from("card_participants").upsert(
        {
          card_id: card.id,
          participant_id: participantId,
          is_participating: checked,
        },
        { onConflict: "card_id,participant_id" }
      );

      if (error) {
        // Rollback
        setCardParticipants((prev) => ({
          ...prev,
          [participantId]: !checked,
        }));
      }
    } catch {
      setCardParticipants((prev) => ({
        ...prev,
        [participantId]: !checked,
      }));
    }
  };

  const participatingCount = Object.values(cardParticipants).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Activity Participants</Label>
        <Badge variant="secondary">
          {participatingCount} of {participants.length} participants
        </Badge>
      </div>

      <Separator />

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading participants...</p>
      ) : (
        <div className="space-y-2">
          {participants.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/50 transition-colors"
            >
              <Checkbox
                checked={cardParticipants[p.id] ?? false}
                onCheckedChange={(checked) =>
                  handleToggle(p.id, checked === true)
                }
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  {p.first_name} {p.last_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.email}
                </p>
              </div>
              {p.is_organizer && (
                <Badge variant="outline" className="text-xs">
                  Organizer
                </Badge>
              )}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// EXPENSES TAB
// ===========================================================================

interface ExpensesTabProps {
  card: CardWithVoteStats;
  supabase: ReturnType<typeof createClient>;
  participants: Participant[];
  currentParticipant: ReturnType<typeof useParticipant>["participant"];
}

function ExpensesTab({
  card,
  supabase,
  participants,
  currentParticipant,
}: ExpensesTabProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Add expense form
  const [amount, setAmount] = useState<number>(0);
  const [paidBy, setPaidBy] = useState<string>("");
  const [splitType, setSplitType] = useState<SplitType>("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Payment links
  const [venmoLink, setVenmoLink] = useState("");
  const [paypalLink, setPaypalLink] = useState("");

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("expenses")
        .select(
          "*, paid_by:participants!paid_by_participant_id(*), splits:expense_splits(*, participant:participants(*))"
        )
        .eq("card_id", card.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setExpenses(data as Expense[]);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase, card.id]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Initialize paidBy with current participant
  useEffect(() => {
    if (currentParticipant && !paidBy) {
      setPaidBy(currentParticipant.participant_id);
    }
  }, [currentParticipant, paidBy]);

  // Initialize custom splits when participants change or split type changes
  useEffect(() => {
    if (splitType !== "equal") {
      const initial: Record<string, number> = {};
      participants.forEach((p) => {
        initial[p.id] = 0;
      });
      setCustomSplits(initial);
    }
  }, [splitType, participants]);

  const perPersonAmount =
    splitType === "equal" && participants.length > 0
      ? amount / participants.length
      : 0;

  const handleAddExpense = async () => {
    if (!paidBy || amount <= 0 || submitting) return;

    let splits: { participant_id: string; amount_owed: number }[] = [];

    if (splitType === "equal") {
      splits = participants.map((p) => ({
        participant_id: p.id,
        amount_owed: parseFloat((amount / participants.length).toFixed(2)),
      }));
    } else if (splitType === "custom_amount") {
      splits = Object.entries(customSplits)
        .filter(([, val]) => val > 0)
        .map(([pid, val]) => ({
          participant_id: pid,
          amount_owed: val,
        }));
    } else if (splitType === "custom_percent") {
      splits = Object.entries(customSplits)
        .filter(([, val]) => val > 0)
        .map(([pid, pct]) => ({
          participant_id: pid,
          amount_owed: parseFloat(((pct / 100) * amount).toFixed(2)),
        }));
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: card.id,
          amount,
          paid_by_participant_id: paidBy,
          split_type: splitType,
          category: card.category || "General",
          splits,
        }),
      });

      if (response.ok) {
        setAmount(0);
        setSplitType("equal");
        setCustomSplits({});
        setShowForm(false);
        await fetchExpenses();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettle = async (expenseId: string, splitId: string) => {
    try {
      const response = await fetch(`/api/expenses/${expenseId}/settle`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ split_id: splitId }),
      });
      if (response.ok) {
        await fetchExpenses();
      }
    } catch {
      // silently fail
    }
  };

  const participantName = (id: string) => {
    const p = participants.find((p) => p.id === id);
    return p ? `${p.first_name} ${p.last_name}` : "Unknown";
  };

  return (
    <div className="space-y-6">
      {/* Budget display */}
      <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
        <div>
          <p className="text-sm text-muted-foreground">Budgeted Amount</p>
          <p className="text-2xl font-bold">
            ${card.budget > 0 ? card.budget.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "0.00"}
          </p>
        </div>
        <DollarSign className="h-8 w-8 text-muted-foreground/50" />
      </div>

      {/* Payment links */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Payment links (optional)</Label>
        <div className="grid grid-cols-2 gap-3">
          <Input
            placeholder="Venmo username or link"
            value={venmoLink}
            onChange={(e) => setVenmoLink(e.target.value)}
          />
          <Input
            placeholder="PayPal email or link"
            value={paypalLink}
            onChange={(e) => setPaypalLink(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      {/* Add expense */}
      {!showForm ? (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add Expense
        </Button>
      ) : (
        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Add Expense</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="expense-amount">Amount</Label>
            <Input
              id="expense-amount"
              type="number"
              min={0}
              step={0.01}
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>

          {/* Who paid */}
          <div className="space-y-2">
            <Label>Who paid?</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger>
                <SelectValue placeholder="Select who paid" />
              </SelectTrigger>
              <SelectContent>
                {participants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.first_name} {p.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Split method */}
          <div className="space-y-3">
            <Label>Split Method</Label>
            <RadioGroup
              value={splitType}
              onValueChange={(v) => setSplitType(v as SplitType)}
              className="flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="equal" id="split-equal" />
                <Label htmlFor="split-equal" className="cursor-pointer text-sm">
                  Equal
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom_amount" id="split-amount" />
                <Label
                  htmlFor="split-amount"
                  className="cursor-pointer text-sm"
                >
                  Custom Amount
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom_percent" id="split-percent" />
                <Label
                  htmlFor="split-percent"
                  className="cursor-pointer text-sm"
                >
                  Custom Percent
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Equal split display */}
          {splitType === "equal" && amount > 0 && (
            <div className="rounded-md bg-muted/50 p-3 text-sm">
              <p className="text-muted-foreground">
                Each person pays:{" "}
                <span className="font-semibold text-foreground">
                  ${perPersonAmount.toFixed(2)}
                </span>{" "}
                ({participants.length} participants)
              </p>
            </div>
          )}

          {/* Custom split inputs */}
          {splitType !== "equal" && (
            <div className="space-y-2">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-sm min-w-[120px] truncate">
                    {p.first_name} {p.last_name}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    step={splitType === "custom_percent" ? 1 : 0.01}
                    value={customSplits[p.id] || ""}
                    onChange={(e) =>
                      setCustomSplits((prev) => ({
                        ...prev,
                        [p.id]: Number(e.target.value),
                      }))
                    }
                    placeholder={splitType === "custom_percent" ? "0%" : "0.00"}
                    className="flex-1"
                  />
                  {splitType === "custom_percent" && (
                    <span className="text-sm text-muted-foreground w-8">%</span>
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleAddExpense}
            disabled={amount <= 0 || !paidBy || submitting}
          >
            {submitting ? "Adding..." : "Add Expense"}
          </Button>
        </div>
      )}

      <Separator />

      {/* Expense list */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Expenses</Label>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading expenses...</p>
        ) : expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No expenses recorded yet.
          </p>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      ${expense.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Paid by{" "}
                      {expense.paid_by
                        ? `${expense.paid_by.first_name} ${expense.paid_by.last_name}`
                        : participantName(expense.paid_by_participant_id)}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {expense.split_type === "equal"
                      ? "Equal Split"
                      : expense.split_type === "custom_amount"
                      ? "Custom Amount"
                      : "Custom %"}
                  </Badge>
                </div>

                {/* Splits */}
                {expense.splits && expense.splits.length > 0 && (
                  <div className="space-y-1.5">
                    {expense.splits.map((split) => (
                      <div
                        key={split.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {split.is_settled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-500" />
                          )}
                          <span>
                            {split.participant
                              ? `${split.participant.first_name} ${split.participant.last_name}`
                              : participantName(split.participant_id)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              split.is_settled
                                ? "text-green-600"
                                : "text-yellow-600"
                            }
                          >
                            ${split.amount_owed.toFixed(2)}
                          </span>
                          {!split.is_settled && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() =>
                                handleSettle(expense.id, split.id)
                              }
                            >
                              Mark Settled
                            </Button>
                          )}
                          {split.is_settled && (
                            <span className="text-xs text-green-600">
                              Settled
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
