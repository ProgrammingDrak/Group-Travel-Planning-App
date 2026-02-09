"use client";

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  SortAsc,
  Star,
  Calendar,
  DollarSign,
  MoreVertical,
  Pencil,
  Trash2,
  Clock,
  MapPin,
  List,
} from "lucide-react";
import type { CardWithVoteStats, CardStage, Participant } from "@/types";

const stageLabels: Record<CardStage, string> = {
  idea: "Idea",
  hot_contender: "Hot Contender",
  chosen: "Chosen",
  booked: "Booked",
};

const stageBadgeStyles: Record<CardStage, string> = {
  idea: "bg-gray-100 text-gray-700",
  hot_contender: "bg-yellow-100 text-yellow-800",
  chosen: "bg-green-100 text-green-800",
  booked: "bg-blue-100 text-blue-800",
};

type SortOption = "date" | "budget" | "votes" | "title";

interface ListViewProps {
  cards: CardWithVoteStats[];
  participants: Participant[];
  onCardClick: (card: CardWithVoteStats) => void;
  onDeleteCard: (cardId: string) => Promise<void>;
}

export function ListView({
  cards,
  onCardClick,
  onDeleteCard,
}: ListViewProps) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<CardStage | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("date");

  const categories = useMemo(() => {
    const cats = new Set(cards.map((c) => c.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    let result = [...cards];

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    // Stage filter
    if (stageFilter !== "all") {
      result = result.filter((c) => c.stage === stageFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      result = result.filter((c) => c.category === categoryFilter);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "date":
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.localeCompare(b.date);
        case "budget":
          return b.budget - a.budget;
        case "votes":
          return (b.avg_score || 0) - (a.avg_score || 0);
        case "title":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return result;
  }, [cards, search, stageFilter, categoryFilter, sortBy]);

  const formatTime = (time: string | null) => {
    if (!time) return "";
    const [hours, minutes] = time.split(":");
    const h = parseInt(hours);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  };

  return (
    <div className="space-y-4">
      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cards..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={stageFilter}
            onValueChange={(v) => setStageFilter(v as CardStage | "all")}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stages</SelectItem>
              {Object.entries(stageLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[120px]">
              <SortAsc className="h-4 w-4 mr-1" />
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="budget">Budget</SelectItem>
              <SelectItem value="votes">Votes</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        {filteredCards.length} card{filteredCards.length !== 1 ? "s" : ""}
      </p>

      {/* Card list */}
      <div className="space-y-2">
        {filteredCards.map((card) => (
          <div
            key={card.id}
            className="group flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onCardClick(card)}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm truncate">{card.title}</h4>
                <Badge
                  variant="outline"
                  className={`text-xs flex-shrink-0 ${stageBadgeStyles[card.stage]}`}
                >
                  {stageLabels[card.stage]}
                </Badge>
                {card.category && (
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {card.category}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                {card.date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {format(parseISO(card.date), "MMM d")}
                  </span>
                )}
                {card.start_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(card.start_time)}
                  </span>
                )}
                {card.location && (
                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {card.location}
                  </span>
                )}
                {card.budget > 0 && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {card.budget.toLocaleString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {card.avg_score ? card.avg_score.toFixed(1) : "—"}
                </span>
              </div>
            </div>

            {/* Quick actions */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onCardClick(card);
                    }}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteCard(card.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>

      {filteredCards.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <List className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No cards match your filters.</p>
        </div>
      )}
    </div>
  );
}
