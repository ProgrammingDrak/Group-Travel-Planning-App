"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import { Plus, MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardType } from "@/types";
import { CARD_TYPE_ICONS, type CardTypeKey } from "@/lib/card-icons";

const QUICK_TYPES: { value: CardType; emoji: string }[] = [
  { value: "activity", emoji: CARD_TYPE_ICONS.activity.emoji },
  { value: "restaurant", emoji: CARD_TYPE_ICONS.restaurant.emoji },
  { value: "sightseeing", emoji: CARD_TYPE_ICONS.sightseeing.emoji },
  { value: "outdoor", emoji: CARD_TYPE_ICONS.outdoor.emoji },
  { value: "event", emoji: CARD_TYPE_ICONS.event.emoji },
  { value: "nightlife", emoji: CARD_TYPE_ICONS.nightlife.emoji },
  { value: "shopping", emoji: CARD_TYPE_ICONS.shopping.emoji },
  { value: "beach", emoji: CARD_TYPE_ICONS.beach.emoji },
];

interface QuickIdeaInputProps {
  onSubmit: (data: {
    title: string;
    type: CardType;
    location: string;
    address: string;
    lat: number | null;
    lng: number | null;
  }) => Promise<void>;
}

export function QuickIdeaInput({ onSubmit }: QuickIdeaInputProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<CardType>("activity");
  const [showLocation, setShowLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        type,
        location,
        address,
        lat,
        lng,
      });
      setTitle("");
      setLocation("");
      setAddress("");
      setLat(null);
      setLng(null);
      setShowLocation(false);
    } finally {
      setSubmitting(false);
    }
  }, [title, type, location, address, lat, lng, submitting, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2 p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick add an idea..."
          className="flex-1 text-sm"
          disabled={submitting}
        />
        <Button
          size="icon"
          variant="ghost"
          className={cn(
            "h-9 w-9 flex-shrink-0",
            showLocation && "bg-primary/10 text-primary"
          )}
          onClick={() => setShowLocation(!showLocation)}
          title="Add location"
        >
          <MapPin className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!title.trim() || submitting}
          className="flex-shrink-0 gap-1"
        >
          {submitting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
          Add
        </Button>
      </div>

      {/* Card type quick select */}
      <div className="flex items-center gap-1">
        {QUICK_TYPES.map((t) => (
          <button
            key={t.value}
            type="button"
            className={cn(
              "text-sm px-1.5 py-0.5 rounded transition-colors",
              type === t.value
                ? "bg-primary/20 ring-1 ring-primary/40"
                : "hover:bg-muted"
            )}
            onClick={() => setType(t.value)}
            title={CARD_TYPE_ICONS[t.value as CardTypeKey].label}
          >
            {t.emoji}
          </button>
        ))}
      </div>

      {/* Optional location autocomplete */}
      {showLocation && (
        <LocationAutocomplete
          value={location}
          onChange={setLocation}
          onSelect={(s) => {
            setLocation(s.name);
            setAddress(s.address);
            setLat(s.lat);
            setLng(s.lng);
          }}
          placeholder="Where is this? (optional)"
          className="text-sm"
        />
      )}
    </div>
  );
}
