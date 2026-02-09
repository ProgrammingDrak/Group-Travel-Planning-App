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
import { Loader2 } from "lucide-react";
import type { CardType } from "@/types";

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
}

const cardTypes: { value: CardType; label: string }[] = [
  { value: "activity", label: "Activity" },
  { value: "restaurant", label: "Restaurant" },
  { value: "event", label: "Event" },
  { value: "lodging", label: "Lodging" },
  { value: "rental", label: "Rental" },
];

export function AddCardDialog({
  isOpen,
  onClose,
  onSubmit,
  defaultDate,
}: AddCardDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CardType>("activity");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        type,
        description,
        date: date || null,
        start_time: startTime || null,
        location,
        budget: parseFloat(budget) || 0,
      });
      // Reset form
      setTitle("");
      setType("activity");
      setDescription("");
      setDate(defaultDate || "");
      setStartTime("");
      setLocation("");
      setBudget("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Card</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-2 gap-3">
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
                      {ct.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-date">Date</Label>
              <Input
                id="card-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="card-time">Start Time</Label>
              <Input
                id="card-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-budget">Budget ($)</Label>
              <Input
                id="card-budget"
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-location">Location</Label>
            <Input
              id="card-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Champ de Mars, Paris"
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
  );
}
