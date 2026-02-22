"use client";

import type { CommuteSegment } from "@/types";
import { TRANSPORT_MODE_ICONS } from "@/lib/card-icons";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";

interface CommuteSegmentIndicatorProps {
  segment: CommuteSegment | null;
  onEdit: () => void;
  defaultMinutes?: number;
}

export function CommuteSegmentIndicator({
  segment,
  onEdit,
  defaultMinutes = 15,
}: CommuteSegmentIndicatorProps) {
  // No segment exists - show dashed line with "+" button
  if (!segment) {
    return (
      <div className="flex items-center justify-center py-1">
        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
        <button
          type="button"
          onClick={onEdit}
          className="mx-2 flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 text-muted-foreground/60 transition-colors hover:border-primary hover:text-primary hover:bg-primary/5"
          aria-label="Add commute info"
        >
          <Plus className="h-3 w-3" />
        </button>
        <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
      </div>
    );
  }

  const primaryOption = segment.options[0] ?? null;
  const optionCount = segment.options.length;

  const modeInfo = primaryOption
    ? TRANSPORT_MODE_ICONS[primaryOption.mode] ?? TRANSPORT_MODE_ICONS.other
    : null;

  const displayMinutes = primaryOption
    ? primaryOption.duration_minutes
    : defaultMinutes;

  return (
    <button
      type="button"
      onClick={onEdit}
      className="group flex w-full items-center justify-center gap-2 py-1 transition-colors"
    >
      {/* Left line */}
      <div className="flex-1 border-t border-muted-foreground/20 group-hover:border-primary/40 transition-colors" />

      {/* Indicator pill */}
      <div className="flex items-center gap-1.5 rounded-full border border-muted-foreground/20 bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground group-hover:border-primary/30 group-hover:bg-primary/5 group-hover:text-foreground transition-colors">
        {/* Primary transport mode + duration */}
        {modeInfo ? (
          <span className="flex items-center gap-1">
            <span>{modeInfo.emoji}</span>
            <span>{displayMinutes} min</span>
          </span>
        ) : (
          <span>{displayMinutes} min</span>
        )}

        {/* Break time */}
        {segment.break_minutes > 0 && (
          <span className="flex items-center gap-1 text-muted-foreground/70">
            <span>+</span>
            <span className="flex items-center gap-0.5">
              <span>&#9749;</span>
              <span>{segment.break_minutes} min break</span>
            </span>
          </span>
        )}

        {/* Multiple options badge */}
        {optionCount > 1 && (
          <Badge
            variant="secondary"
            className="ml-0.5 h-4 px-1.5 py-0 text-[10px] leading-none"
          >
            {optionCount} options
          </Badge>
        )}
      </div>

      {/* Right line */}
      <div className="flex-1 border-t border-muted-foreground/20 group-hover:border-primary/40 transition-colors" />
    </button>
  );
}
