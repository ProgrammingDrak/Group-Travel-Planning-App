"use client";

import { useState } from "react";
import type {
  CommuteSegment,
  CommuteOption,
  TransportMode,
  Participant,
} from "@/types";
import { TRANSPORT_MODE_ICONS } from "@/lib/card-icons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CommuteEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment: CommuteSegment | null;
  fromCardTitle: string;
  toCardTitle: string;
  participants: Participant[];
  onSave: (data: { breakMinutes: number }) => void;
  onAddOption: (data: {
    mode: TransportMode;
    label: string;
    duration_minutes: number;
    cost: number;
    notes: string;
    confirmation_number: string;
    detail_fields: Record<string, string>;
  }) => void;
  onUpdateOption: (optionId: string, data: Partial<CommuteOption>) => void;
  onDeleteOption: (optionId: string) => void;
  onAssignParticipant: (optionId: string, participantId: string) => void;
  onRemoveParticipant: (optionId: string, participantId: string) => void;
}

// All supported transport modes in display order
const TRANSPORT_MODES: TransportMode[] = [
  "walk",
  "drive",
  "bike",
  "train",
  "bus",
  "boat",
  "plane",
  "uber",
  "taxi",
  "other",
];

// Mode-specific detail field definitions
const MODE_DETAIL_FIELDS: Partial<
  Record<TransportMode, { key: string; label: string; placeholder: string }[]>
> = {
  plane: [
    { key: "flight_number", label: "Flight Number", placeholder: "e.g. AA 1234" },
    { key: "airline", label: "Airline", placeholder: "e.g. American Airlines" },
    { key: "terminal", label: "Terminal", placeholder: "e.g. Terminal B" },
  ],
  train: [
    { key: "line_route", label: "Line / Route", placeholder: "e.g. Northeast Regional" },
    { key: "platform", label: "Platform", placeholder: "e.g. Platform 3" },
    { key: "station", label: "Station", placeholder: "e.g. Penn Station" },
  ],
  uber: [
    { key: "ride_type", label: "Ride Type", placeholder: "e.g. UberX, UberXL" },
    { key: "pickup_location", label: "Pickup Location", placeholder: "e.g. Main lobby" },
  ],
  taxi: [
    { key: "ride_type", label: "Ride Type", placeholder: "e.g. Yellow cab" },
    { key: "pickup_location", label: "Pickup Location", placeholder: "e.g. Front entrance" },
  ],
  drive: [
    { key: "vehicle", label: "Vehicle", placeholder: "e.g. Jake's SUV" },
    { key: "parking_info", label: "Parking Info", placeholder: "e.g. Garage on 5th St" },
  ],
};

// Also include "car" mapping (treat same as drive for detail fields) – but since
// TransportMode doesn't include "car", we just keep drive above.

// ---------------------------------------------------------------------------
// New option form state
// ---------------------------------------------------------------------------

interface NewOptionFormState {
  mode: TransportMode;
  label: string;
  duration_minutes: string;
  cost: string;
  notes: string;
  confirmation_number: string;
  detail_fields: Record<string, string>;
}

const EMPTY_NEW_OPTION: NewOptionFormState = {
  mode: "drive",
  label: "",
  duration_minutes: "",
  cost: "",
  notes: "",
  confirmation_number: "",
  detail_fields: {},
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommuteEditor({
  open,
  onOpenChange,
  segment,
  fromCardTitle,
  toCardTitle,
  participants,
  onSave,
  onAddOption,
  onUpdateOption,
  onDeleteOption,
  onAssignParticipant,
  onRemoveParticipant,
}: CommuteEditorProps) {
  const [breakMinutes, setBreakMinutes] = useState<string>(
    String(segment?.break_minutes ?? 0)
  );
  const [newOption, setNewOption] = useState<NewOptionFormState>(EMPTY_NEW_OPTION);
  const [showNewForm, setShowNewForm] = useState(false);

  // Sync break minutes when segment changes (dialog opening)
  // We use a key on the Dialog or rely on open state.
  // For simplicity, reset when dialog opens.
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setBreakMinutes(String(segment?.break_minutes ?? 0));
      setShowNewForm(false);
      setNewOption(EMPTY_NEW_OPTION);
    }
    onOpenChange(nextOpen);
  };

  // ------- Break time -------

  const handleSaveBreak = () => {
    const parsed = parseInt(breakMinutes, 10);
    onSave({ breakMinutes: isNaN(parsed) || parsed < 0 ? 0 : parsed });
  };

  // ------- New option -------

  const handleAddOption = () => {
    const durationParsed = parseInt(newOption.duration_minutes, 10);
    const costParsed = parseFloat(newOption.cost);

    onAddOption({
      mode: newOption.mode,
      label: newOption.label,
      duration_minutes: isNaN(durationParsed) || durationParsed < 0 ? 0 : durationParsed,
      cost: isNaN(costParsed) || costParsed < 0 ? 0 : costParsed,
      notes: newOption.notes,
      confirmation_number: newOption.confirmation_number,
      detail_fields: { ...newOption.detail_fields },
    });

    setNewOption(EMPTY_NEW_OPTION);
    setShowNewForm(false);
  };

  // ------- Helpers -------

  function isParticipantAssigned(option: CommuteOption, participantId: string): boolean {
    return (
      option.participants?.some((p) => p.participant_id === participantId) ?? false
    );
  }

  function handleParticipantToggle(
    option: CommuteOption,
    participantId: string,
    checked: boolean
  ) {
    if (checked) {
      onAssignParticipant(option.id, participantId);
    } else {
      onRemoveParticipant(option.id, participantId);
    }
  }

  const detailFieldsForMode = (mode: TransportMode) =>
    MODE_DETAIL_FIELDS[mode] ?? [];

  // ------- Render -------

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <span className="truncate">{fromCardTitle}</span>
            <span className="text-muted-foreground">&rarr;</span>
            <span className="truncate">{toCardTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {/* ========== Break Time Section ========== */}
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Break / Buffer Time</h3>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Label htmlFor="break-minutes" className="text-sm text-muted-foreground whitespace-nowrap">
                Minutes
              </Label>
              <Input
                id="break-minutes"
                type="number"
                min={0}
                value={breakMinutes}
                onChange={(e) => setBreakMinutes(e.target.value)}
                className="w-24"
                placeholder="0"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={handleSaveBreak}>
              Save
            </Button>
          </div>
        </section>

        {/* ========== Existing Options ========== */}
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Transport Options</h3>

          {segment?.options && segment.options.length > 0 ? (
            <div className="space-y-4">
              {segment.options.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  participants={participants}
                  isParticipantAssigned={isParticipantAssigned}
                  onParticipantToggle={handleParticipantToggle}
                  onUpdate={onUpdateOption}
                  onDelete={onDeleteOption}
                  detailFieldsForMode={detailFieldsForMode}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No transport options yet.</p>
          )}
        </section>

        {/* ========== Add New Option ========== */}
        <section className="space-y-3 border-t pt-3">
          {!showNewForm ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewForm(true)}
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Transport Option
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border border-dashed border-muted-foreground/30 p-4">
              <h4 className="text-sm font-medium">New Transport Option</h4>

              {/* Mode */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Mode</Label>
                <Select
                  value={newOption.mode}
                  onValueChange={(val) =>
                    setNewOption((prev) => ({
                      ...prev,
                      mode: val as TransportMode,
                      detail_fields: {},
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSPORT_MODES.map((m) => {
                      const info = TRANSPORT_MODE_ICONS[m];
                      return (
                        <SelectItem key={m} value={m}>
                          {info.emoji} {info.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Label */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Label</Label>
                <Input
                  placeholder="e.g. Jake's Car, Sarah's Uber"
                  value={newOption.label}
                  onChange={(e) =>
                    setNewOption((prev) => ({ ...prev, label: e.target.value }))
                  }
                />
              </div>

              {/* Duration + Cost row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Duration (min)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="15"
                    value={newOption.duration_minutes}
                    onChange={(e) =>
                      setNewOption((prev) => ({
                        ...prev,
                        duration_minutes: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Cost ($)</Label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    placeholder="0.00"
                    value={newOption.cost}
                    onChange={(e) =>
                      setNewOption((prev) => ({ ...prev, cost: e.target.value }))
                    }
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  placeholder="Any notes about this option..."
                  value={newOption.notes}
                  onChange={(e) =>
                    setNewOption((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="min-h-[60px]"
                />
              </div>

              {/* Confirmation number */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Confirmation Number</Label>
                <Input
                  placeholder="e.g. ABC123"
                  value={newOption.confirmation_number}
                  onChange={(e) =>
                    setNewOption((prev) => ({
                      ...prev,
                      confirmation_number: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Mode-specific detail fields */}
              {detailFieldsForMode(newOption.mode).length > 0 && (
                <div className="space-y-2 rounded-md bg-muted/40 p-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {TRANSPORT_MODE_ICONS[newOption.mode]?.label} Details
                  </p>
                  {detailFieldsForMode(newOption.mode).map((field) => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        {field.label}
                      </Label>
                      <Input
                        placeholder={field.placeholder}
                        value={newOption.detail_fields[field.key] ?? ""}
                        onChange={(e) =>
                          setNewOption((prev) => ({
                            ...prev,
                            detail_fields: {
                              ...prev.detail_fields,
                              [field.key]: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" onClick={handleAddOption}>
                  Add Option
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowNewForm(false);
                    setNewOption(EMPTY_NEW_OPTION);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// OptionCard – renders a single existing CommuteOption inside the editor
// ---------------------------------------------------------------------------

interface OptionCardProps {
  option: CommuteOption;
  participants: Participant[];
  isParticipantAssigned: (option: CommuteOption, participantId: string) => boolean;
  onParticipantToggle: (
    option: CommuteOption,
    participantId: string,
    checked: boolean
  ) => void;
  onUpdate: (optionId: string, data: Partial<CommuteOption>) => void;
  onDelete: (optionId: string) => void;
  detailFieldsForMode: (
    mode: TransportMode
  ) => { key: string; label: string; placeholder: string }[];
}

function OptionCard({
  option,
  participants,
  isParticipantAssigned,
  onParticipantToggle,
  onUpdate,
  onDelete,
  detailFieldsForMode,
}: OptionCardProps) {
  const modeInfo = TRANSPORT_MODE_ICONS[option.mode] ?? TRANSPORT_MODE_ICONS.other;
  const modeDetailFields = detailFieldsForMode(option.mode);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Header row: mode + label + delete */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" title={modeInfo.label}>
            {modeInfo.emoji}
          </span>
          <span className="text-sm font-medium truncate">
            {option.label || modeInfo.label}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(option.id)}
          aria-label="Delete option"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Mode dropdown */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Mode</Label>
        <Select
          value={option.mode}
          onValueChange={(val) =>
            onUpdate(option.id, { mode: val as TransportMode })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRANSPORT_MODES.map((m) => {
              const info = TRANSPORT_MODE_ICONS[m];
              return (
                <SelectItem key={m} value={m}>
                  {info.emoji} {info.label}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Label */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Label</Label>
        <Input
          placeholder="e.g. Jake's Car, Sarah's Uber"
          defaultValue={option.label}
          onBlur={(e) => {
            if (e.target.value !== option.label) {
              onUpdate(option.id, { label: e.target.value });
            }
          }}
        />
      </div>

      {/* Duration + Cost */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Duration (min)</Label>
          <Input
            type="number"
            min={0}
            defaultValue={option.duration_minutes}
            onBlur={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val !== option.duration_minutes) {
                onUpdate(option.id, { duration_minutes: val });
              }
            }}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Cost ($)</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            defaultValue={option.cost}
            onBlur={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val) && val !== option.cost) {
                onUpdate(option.id, { cost: val });
              }
            }}
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Notes</Label>
        <Textarea
          placeholder="Any notes..."
          defaultValue={option.notes}
          className="min-h-[60px]"
          onBlur={(e) => {
            if (e.target.value !== option.notes) {
              onUpdate(option.id, { notes: e.target.value });
            }
          }}
        />
      </div>

      {/* Confirmation number */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Confirmation Number</Label>
        <Input
          placeholder="e.g. ABC123"
          defaultValue={option.confirmation_number}
          onBlur={(e) => {
            if (e.target.value !== option.confirmation_number) {
              onUpdate(option.id, { confirmation_number: e.target.value });
            }
          }}
        />
      </div>

      {/* Mode-specific detail fields */}
      {modeDetailFields.length > 0 && (
        <div className="space-y-2 rounded-md bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {modeInfo.label} Details
          </p>
          {modeDetailFields.map((field) => (
            <div key={field.key} className="space-y-1">
              <Label className="text-xs text-muted-foreground">{field.label}</Label>
              <Input
                placeholder={field.placeholder}
                defaultValue={option.detail_fields?.[field.key] ?? ""}
                onBlur={(e) => {
                  const current = option.detail_fields?.[field.key] ?? "";
                  if (e.target.value !== current) {
                    onUpdate(option.id, {
                      detail_fields: {
                        ...option.detail_fields,
                        [field.key]: e.target.value,
                      },
                    });
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Participant assignment */}
      {participants.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Assigned Participants</Label>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {participants.map((p) => {
              const assigned = isParticipantAssigned(option, p.id);
              return (
                <label
                  key={p.id}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={assigned}
                    onCheckedChange={(checked) =>
                      onParticipantToggle(option, p.id, checked === true)
                    }
                  />
                  <span>
                    {p.first_name} {p.last_name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
