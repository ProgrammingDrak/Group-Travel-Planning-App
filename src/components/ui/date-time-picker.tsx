"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateTimePickerProps {
  date: string;
  time: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  suggestedArrival?: boolean;
  onSuggestedArrivalChange?: (enabled: boolean) => void;
  suggestedArrivalNotes?: string;
  onSuggestedArrivalNotesChange?: (notes: string) => void;
  label?: string;
  id?: string;
  minDate?: string;
  maxDate?: string;
}

export function DateTimePicker({
  date,
  time,
  onDateChange,
  onTimeChange,
  suggestedArrival = false,
  onSuggestedArrivalChange,
  suggestedArrivalNotes = "",
  onSuggestedArrivalNotesChange,
  label = "Date & Time",
  id,
  minDate,
  maxDate,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const formatDisplay = () => {
    if (!date && !time) return "Select date & time...";
    const parts: string[] = [];
    if (date) {
      try {
        const d = new Date(date + "T00:00:00");
        parts.push(
          d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        );
      } catch {
        parts.push(date);
      }
    }
    if (time) {
      const [hours, minutes] = time.split(":");
      const h = parseInt(hours);
      const ampm = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      parts.push(`${h12}:${minutes} ${ampm}`);
      if (suggestedArrival) {
        parts.push("(Suggested)");
      }
    }
    return parts.join(" at ");
  };

  return (
    <div className="space-y-2">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-10",
              !date && !time && "text-muted-foreground"
            )}
          >
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            {formatDisplay()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-4 space-y-4" align="start">
          {/* Date input */}
          <div className="space-y-2">
            <Label htmlFor={`${id}-date`} className="text-xs font-medium">
              Date
            </Label>
            <Input
              id={`${id}-date`}
              type="date"
              value={date}
              onChange={(e) => onDateChange(e.target.value)}
              min={minDate}
              max={maxDate}
            />
          </div>

          {/* Time input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={`${id}-time`} className="text-xs font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Time
                </span>
              </Label>
            </div>
            <Input
              id={`${id}-time`}
              type="time"
              value={time}
              onChange={(e) => onTimeChange(e.target.value)}
            />
          </div>

          {/* Suggested Arrival Time toggle */}
          {onSuggestedArrivalChange && (
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor={`${id}-suggested`}
                  className="text-xs font-medium cursor-pointer flex items-center gap-1"
                >
                  <Info className="h-3 w-3 text-muted-foreground" />
                  Suggested Arrival Time
                </Label>
                <Switch
                  id={`${id}-suggested`}
                  checked={suggestedArrival}
                  onCheckedChange={onSuggestedArrivalChange}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Mark this as a suggested arrival time instead of a fixed schedule
              </p>

              {suggestedArrival && onSuggestedArrivalNotesChange && (
                <div className="space-y-1">
                  <Label
                    htmlFor={`${id}-arrival-notes`}
                    className="text-xs font-medium"
                  >
                    Why this time?
                  </Label>
                  <Textarea
                    id={`${id}-arrival-notes`}
                    value={suggestedArrivalNotes}
                    onChange={(e) =>
                      onSuggestedArrivalNotesChange(e.target.value)
                    }
                    placeholder="e.g., Happy hour starts at 5 PM, best to arrive early for seating..."
                    rows={2}
                    className="text-xs"
                  />
                </div>
              )}
            </div>
          )}

          <Button
            type="button"
            size="sm"
            className="w-full"
            onClick={() => setOpen(false)}
          >
            Done
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
