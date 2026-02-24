"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Using Dialog for the confirmation dialog as well
import { Loader2, AlertTriangle, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { ExpenseItemBuilder, type ExpenseItem } from "@/components/ui/expense-item-builder";
import type { CardType } from "@/types";
import { getCardTypeInfo } from "@/lib/card-icons";

interface AddCardDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    type: CardType;
    description: string;
    date: string | null;
    start_time: string | null;
    location: string;
    budget: number;
  }) => Promise<void>;
  defaultDate?: string | null;
  tripId: string;
  tripStartDate?: string;
  tripEndDate?: string;
  tripDestination?: string;
}

const cardTypes: { value: CardType; label: string; emoji: string }[] = [
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

export function AddCardDialog({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
  tripStartDate,
  tripEndDate,
  tripDestination,
}: AddCardDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CardType>("activity");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [suggestedArrival, setSuggestedArrival] = useState(false);
  const [suggestedArrivalNotes, setSuggestedArrivalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Rev 9: Out-of-range date confirmation
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  // AI assist
  const [aiExpanded, setAiExpanded] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const isDateOutOfRange = () => {
    if (!date || !tripStartDate || !tripEndDate) return false;
    return date < tripStartDate || date > tripEndDate;
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Rev 9: Check if date is out of range
    if (isDateOutOfRange() && !pendingSubmit) {
      setShowDateConfirm(true);
      return;
    }

    setSubmitting(true);
    try {
      const totalBudget = expenseItems.reduce((sum, item) => sum + item.amount, 0);

      // Build description with suggested arrival notes and expense breakdown
      let finalDescription = description;
      if (suggestedArrival && suggestedArrivalNotes.trim()) {
        finalDescription += `\n\n📍 Suggested Arrival Time Notes: ${suggestedArrivalNotes.trim()}`;
      }
      if (expenseItems.length > 0) {
        const breakdown = expenseItems
          .map((item) => `${item.type === "communal" ? "👥" : "👤"} ${item.label}: $${item.amount.toFixed(2)}`)
          .join("\n");
        finalDescription += `\n\n💰 Expense Breakdown:\n${breakdown}`;
      }

      await onSubmit({
        title,
        type,
        description: finalDescription,
        date: date || null,
        start_time: startTime || null,
        location: location + (address ? ` (${address})` : ""),
        budget: totalBudget,
      });
      // Reset form
      setTitle("");
      setType("activity");
      setDescription("");
      setDate(defaultDate || "");
      setStartTime("");
      setLocation("");
      setAddress("");
      setExpenseItems([]);
      setSuggestedArrival(false);
      setSuggestedArrivalNotes("");
      setPendingSubmit(false);
      setAiInput("");
      setAiError(null);
      setAiExpanded(false);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateConfirm = async () => {
    setShowDateConfirm(false);
    setPendingSubmit(true);
    await handleSubmit();
  };

  const handleAiGenerate = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/cards/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: aiInput,
          tripStartDate,
          tripEndDate,
          destination: tripDestination,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAiError(json.error || "Failed to parse input");
        return;
      }
      const d = json.data;
      if (d.title) setTitle(d.title);
      if (d.type) setType(d.type as CardType);
      if (d.description) setDescription(d.description);
      if (d.date) setDate(d.date);
      if (d.start_time) setStartTime(d.start_time);
      if (d.location) setLocation(d.location);
      if (d.address) setAddress(d.address);
      if (d.budget > 0) {
        setExpenseItems([{ id: "ai-1", label: "Estimated cost", amount: d.budget, type: "communal" }]);
      }
      // Collapse AI panel after successful fill
      setAiExpanded(false);
    } catch {
      setAiError("Something went wrong. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const typeInfo = getCardTypeInfo(type);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-lg">{typeInfo.label}</span>
              Add New Card
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* AI Assist panel */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
              <button
                type="button"
                onClick={() => setAiExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4" />
                  AI Assist — describe it or paste a link
                </span>
                {aiExpanded ? (
                  <ChevronUp className="h-4 w-4 opacity-60" />
                ) : (
                  <ChevronDown className="h-4 w-4 opacity-60" />
                )}
              </button>
              {aiExpanded && (
                <div className="px-3 pb-3 space-y-2 border-t border-primary/10">
                  <Textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder={`Describe what you want to do, or paste a link to an event, Google Maps place, or website...\n\nExamples:\n• "Dinner at a rooftop Italian restaurant Friday around 7pm, ~$60pp"\n• "https://maps.google.com/?q=Eiffel+Tower"\n• "Half-day cooking class, meets at 10am, includes lunch"`}
                    rows={4}
                    className="text-sm resize-none"
                  />
                  {aiError && (
                    <p className="text-xs text-destructive">{aiError}</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAiGenerate}
                    disabled={aiLoading || !aiInput.trim()}
                    className="w-full"
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Fill in details with AI
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    AI will pre-fill the fields below — review and edit before saving.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-title">Title *</Label>
              <Input
                id="card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Visit the Eiffel Tower"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as CardType)}
              >
                <SelectTrigger id="card-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cardTypes.map((ct) => (
                    <SelectItem key={ct.value} value={ct.value}>
                      <span className="flex items-center gap-1.5">
                        <span>{ct.emoji}</span> {ct.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rev 6: Combined date-time picker */}
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

            {/* Rev 9: Out-of-range date warning */}
            {isDateOutOfRange() && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <p className="text-yellow-800">
                  This date is outside the trip range
                  {tripStartDate && tripEndDate
                    ? ` (${tripStartDate} to ${tripEndDate})`
                    : ""}
                  . It will be added to a{" "}
                  {date < (tripStartDate ?? "") ? "Pre-Trip" : "Post-Trip"} section.
                </p>
              </div>
            )}

            {/* Rev 7: Location with autocomplete */}
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

            {/* Rev 8: Expense item builder instead of single budget */}
            <div className="space-y-2">
              <Label>Expenses</Label>
              <ExpenseItemBuilder
                items={expenseItems}
                onChange={setExpenseItems}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card-desc">Description</Label>
              <Textarea
                id="card-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this activity..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !title}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Card"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rev 9: Out-of-range date confirmation dialog */}
      <Dialog open={showDateConfirm} onOpenChange={setShowDateConfirm}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Date Outside Trip Range
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The date you selected ({date}) is{" "}
            {date < (tripStartDate ?? "")
              ? "before the trip starts"
              : "after the trip ends"}
            . This activity will be placed in a{" "}
            <strong>
              {date < (tripStartDate ?? "") ? "Pre-Trip" : "Post-Trip"}
            </strong>{" "}
            section.
          </p>
          <p className="text-sm text-muted-foreground">
            Are you sure the date is correct?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowDateConfirm(false)}
            >
              Go Back
            </Button>
            <Button onClick={handleDateConfirm}>
              Yes, Add Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
