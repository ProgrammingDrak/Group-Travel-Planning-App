"use client";

import { useState, useMemo } from "react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import { QuickIdeaInput } from "./quick-idea-input";
import { CardItem } from "@/components/card/card-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Filter, Globe } from "lucide-react";
import {
  groupCardsByProximity,
  milesToKm,
  kmToMiles,
  type LocationGroup,
} from "@/lib/geo-utils";
import type { CardWithVoteStats, CardStage, CardType, Participant, Trip } from "@/types";

const stageFilterOptions: { value: CardStage | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "idea", label: "Ideas" },
  { value: "hot_contender", label: "Hot" },
  { value: "chosen", label: "Chosen" },
  { value: "booked", label: "Booked" },
];

type DistanceUnit = "mi" | "km";

const THRESHOLD_OPTIONS_MI = [
  { value: "10", label: "10 mi" },
  { value: "25", label: "25 mi" },
  { value: "40", label: "40 mi" },
  { value: "50", label: "50 mi" },
];

const THRESHOLD_OPTIONS_KM = [
  { value: "15", label: "15 km" },
  { value: "40", label: "40 km" },
  { value: "65", label: "65 km" },
  { value: "80", label: "80 km" },
];

interface ActivityBankProps {
  cards: CardWithVoteStats[];
  participants: Participant[];
  onCardClick: (card: CardWithVoteStats) => void;
  onCreateIdea: (data: {
    title: string;
    type: CardType;
    location: string;
    address: string;
    lat: number | null;
    lng: number | null;
  }) => Promise<void>;
  trip: Trip;
}

export function ActivityBank({
  cards,
  participants,
  onCardClick,
  onCreateIdea,
}: ActivityBankProps) {
  const [stageFilter, setStageFilter] = useState<CardStage | "all">("all");
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>("mi");
  const [thresholdValue, setThresholdValue] = useState("25");

  const thresholdKm = useMemo(() => {
    const val = parseFloat(thresholdValue);
    return distanceUnit === "mi" ? milesToKm(val) : val;
  }, [thresholdValue, distanceUnit]);

  const thresholdOptions =
    distanceUnit === "mi" ? THRESHOLD_OPTIONS_MI : THRESHOLD_OPTIONS_KM;

  // Filter by stage
  const filteredCards = useMemo(() => {
    if (stageFilter === "all") return cards;
    return cards.filter((c) => c.stage === stageFilter);
  }, [cards, stageFilter]);

  // Group by proximity
  const groups: LocationGroup[] = useMemo(() => {
    return groupCardsByProximity(filteredCards, thresholdKm);
  }, [filteredCards, thresholdKm]);

  // All group IDs for default open state
  const defaultAccordionValues = useMemo(
    () => groups.map((g) => g.id),
    [groups]
  );

  const formatRadius = (radiusKm: number) => {
    if (radiusKm === 0) return "";
    const val =
      distanceUnit === "mi" ? kmToMiles(radiusKm) : radiusKm;
    return `within ${Math.round(val)} ${distanceUnit}`;
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-sm flex items-center gap-1.5">
        <MapPin className="h-4 w-4" />
        Activity Bank
        <Badge variant="secondary" className="text-xs ml-1">
          {cards.length}
        </Badge>
      </h3>

      {/* Quick Idea Input */}
      <QuickIdeaInput onSubmit={onCreateIdea} />

      {/* Filters & Controls */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Filter className="h-3.5 w-3.5 text-muted-foreground" />
        {stageFilterOptions.map((option) => (
          <Button
            key={option.value}
            variant={stageFilter === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => setStageFilter(option.value)}
            className="text-[10px] h-6 px-2"
          >
            {option.label}
          </Button>
        ))}
      </div>

      {/* Proximity threshold + unit toggle */}
      <div className="flex items-center gap-2">
        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
        <Select value={thresholdValue} onValueChange={setThresholdValue}>
          <SelectTrigger className="h-7 w-[90px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {thresholdOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-[10px] px-2"
          onClick={() => {
            const currentVal = parseFloat(thresholdValue);
            if (distanceUnit === "mi") {
              setDistanceUnit("km");
              setThresholdValue(String(Math.round(milesToKm(currentVal))));
            } else {
              setDistanceUnit("mi");
              setThresholdValue(String(Math.round(kmToMiles(currentVal))));
            }
          }}
        >
          {distanceUnit === "mi" ? "Switch to km" : "Switch to mi"}
        </Button>
      </div>

      {/* Grouped cards */}
      {groups.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No unscheduled activities yet. Add ideas above!
        </div>
      )}

      {groups.length > 0 && (
        <Accordion
          type="multiple"
          defaultValue={defaultAccordionValues}
          className="space-y-1"
        >
          {groups.map((group) => (
            <AccordionItem
              key={group.id}
              value={group.id}
              className="border rounded-lg px-3"
            >
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium text-xs truncate max-w-[180px]">
                    {group.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {group.cards.length}
                  </Badge>
                  {group.radiusKm > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatRadius(group.radiusKm)}
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <Droppable droppableId={`bank-${group.id}`}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[30px] rounded-md transition-colors space-y-1 ${
                        snapshot.isDraggingOver
                          ? "bg-accent/50"
                          : "bg-transparent"
                      }`}
                    >
                      {group.cards.map((card, index) => (
                        <Draggable
                          key={card.id}
                          draggableId={card.id}
                          index={index}
                        >
                          {(draggableProvided, draggableSnapshot) => (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                            >
                              <CardItem
                                card={card}
                                onClick={() => onCardClick(card)}
                                isDragging={draggableSnapshot.isDragging}
                                dragHandleProps={
                                  draggableProvided.dragHandleProps as unknown as Record<
                                    string,
                                    unknown
                                  >
                                }
                                totalParticipants={participants.length}
                                compact
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
