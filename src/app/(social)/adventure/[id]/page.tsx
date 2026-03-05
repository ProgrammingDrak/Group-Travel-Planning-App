"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { LikeButton } from "@/components/social/like-button";
import { getCardIcon } from "@/lib/card-icons";
import type { CardWithVoteStats } from "@/types";

interface AdventureDetail {
  id: string;
  profile_id: string;
  trip_id: string;
  caption: string;
  cover_image_url: string;
  visibility: string;
  published_at: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string;
  trip_name: string;
  trip_destination: string;
  trip_start_date: string;
  trip_end_date: string;
  trip_budget: number;
  trip_budget_type: string;
  like_count: number;
  participant_count: number;
  is_liked: boolean;
  tags: Array<{
    id: string;
    tagged_profile_id: string;
    profile: { id: string; username: string; display_name: string; avatar_url: string };
  }>;
  itinerary: {
    cards: CardWithVoteStats[];
    participants: Array<{ id: string; first_name: string; last_name: string }>;
    commute_segments: unknown[];
  };
  budget: {
    total_spent: number;
    per_person: number;
    participant_count: number;
    category_breakdown: Record<string, number>;
    expenses: unknown[];
  };
}

export default function AdventureDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const [adventure, setAdventure] = useState<AdventureDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAdventure() {
      try {
        const res = await fetch(`/api/adventures/${id}`);
        const data = await res.json();
        if (data.data) {
          setAdventure(data.data);
        } else {
          setError("Adventure not found");
        }
      } catch {
        setError("Failed to load adventure");
      } finally {
        setLoading(false);
      }
    }

    fetchAdventure();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="bg-white rounded-lg h-48 border" />
            <div className="bg-white rounded-lg h-96 border" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !adventure) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{error || "Not found"}</h1>
          <Link href="/feed" className="mt-4 text-blue-600 hover:underline block">
            Back to Feed
          </Link>
        </div>
      </div>
    );
  }

  const days = adventure.trip_start_date && adventure.trip_end_date
    ? eachDayOfInterval({
        start: parseISO(adventure.trip_start_date),
        end: parseISO(adventure.trip_end_date),
      })
    : [];

  const cardsByDate: Record<string, CardWithVoteStats[]> = {};
  const unscheduledCards: CardWithVoteStats[] = [];

  (adventure.itinerary.cards ?? []).forEach((card) => {
    if (card.date) {
      const dateKey = card.date;
      if (!cardsByDate[dateKey]) cardsByDate[dateKey] = [];
      cardsByDate[dateKey].push(card);
    } else {
      unscheduledCards.push(card);
    }
  });

  const totalBudget = Number(adventure.trip_budget) || 0;
  const { total_spent, per_person, category_breakdown } = adventure.budget;
  const sortedCategories = Object.entries(category_breakdown).sort(([, a], [, b]) => b - a);
  const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0;

  const authorInitials = adventure.author_display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg border overflow-hidden mb-6">
          {adventure.cover_image_url && (
            <div className="aspect-[3/1] bg-gray-100 relative overflow-hidden">
              <img
                src={adventure.cover_image_url}
                alt={adventure.trip_destination}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Link href={`/profile/${adventure.author_username}`}>
                <Avatar className="h-10 w-10">
                  <AvatarImage src={adventure.author_avatar_url} />
                  <AvatarFallback>{authorInitials}</AvatarFallback>
                </Avatar>
              </Link>
              <div>
                <Link
                  href={`/profile/${adventure.author_username}`}
                  className="font-medium text-gray-900 hover:text-blue-600"
                >
                  {adventure.author_display_name}
                </Link>
                <p className="text-xs text-gray-500">
                  Published {format(new Date(adventure.published_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">
              {adventure.trip_name} — {adventure.trip_destination}
            </h1>

            {adventure.trip_start_date && adventure.trip_end_date && (
              <p className="text-gray-500 mt-1">
                {format(parseISO(adventure.trip_start_date), "MMM d")} -{" "}
                {format(parseISO(adventure.trip_end_date), "MMM d, yyyy")}
              </p>
            )}

            {adventure.caption && (
              <p className="mt-3 text-gray-700">{adventure.caption}</p>
            )}

            {/* Tags */}
            {adventure.tags && adventure.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="text-sm text-gray-500">with</span>
                {adventure.tags.map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/profile/${tag.profile.username}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    @{tag.profile.username}
                  </Link>
                ))}
              </div>
            )}

            {/* Stats bar */}
            <div className="mt-4 flex items-center gap-4 flex-wrap">
              <Badge variant="secondary">
                {adventure.participant_count} travelers
              </Badge>
              <Badge variant="secondary">
                {days.length} days
              </Badge>
              {total_spent > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  ${Math.round(total_spent)} total
                </Badge>
              )}
              {per_person > 0 && (
                <Badge variant="outline" className="text-green-700 border-green-300">
                  ~${Math.round(per_person)}/person
                </Badge>
              )}
              {user && (
                <LikeButton
                  adventureId={adventure.id}
                  isLiked={adventure.is_liked}
                  likeCount={adventure.like_count}
                />
              )}
            </div>
          </div>
        </div>

        {/* Budget Breakdown */}
        {total_spent > 0 && (
          <div className="bg-white rounded-lg border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Budget Breakdown
            </h2>

            {totalBudget > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">
                    ${Math.round(total_spent)} spent of ${Math.round(totalBudget)} budget
                  </span>
                  <span className="text-gray-600">
                    {Math.round((total_spent / totalBudget) * 100)}%
                  </span>
                </div>
                <Progress value={Math.min((total_spent / totalBudget) * 100, 100)} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-gray-900">
                  ${Math.round(total_spent)}
                </p>
                <p className="text-xs text-gray-500">Total Spent</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  ${Math.round(per_person)}
                </p>
                <p className="text-xs text-gray-500">Per Person</p>
              </div>
            </div>

            {sortedCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Where the money went
                </h3>
                <div className="space-y-2">
                  {sortedCategories.map(([category, amount]) => (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 capitalize">{category}</span>
                        <span className="text-gray-600">
                          ${Math.round(amount)} ({Math.round((amount / total_spent) * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(amount / maxCategoryAmount) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Itinerary */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Day-by-Day Itinerary
          </h2>

          {days.length === 0 && unscheduledCards.length === 0 && (
            <p className="text-gray-500 text-center py-8">No activities planned</p>
          )}

          <div className="space-y-6">
            {days.map((day, index) => {
              const dateStr = format(day, "yyyy-MM-dd");
              const dayCards = cardsByDate[dateStr] ?? [];

              return (
                <div key={dateStr}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-sm font-medium">
                      Day {index + 1}
                    </div>
                    <span className="text-gray-500 text-sm">
                      {format(day, "EEEE, MMM d")}
                    </span>
                  </div>

                  {dayCards.length === 0 ? (
                    <p className="text-gray-400 text-sm ml-4">Free day</p>
                  ) : (
                    <div className="space-y-2 ml-4">
                      {dayCards.map((card) => (
                        <ItineraryCard key={card.id} card={card} />
                      ))}
                    </div>
                  )}

                  {index < days.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}

            {unscheduledCards.length > 0 && (
              <div>
                <Separator className="mb-4" />
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-gray-100 text-gray-700 rounded-full px-3 py-1 text-sm font-medium">
                    Unscheduled
                  </div>
                </div>
                <div className="space-y-2 ml-4">
                  {unscheduledCards.map((card) => (
                    <ItineraryCard key={card.id} card={card} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ItineraryCard({ card }: { card: CardWithVoteStats }) {
  const icon = getCardIcon(card.type, card.icon);
  const stageColors: Record<string, string> = {
    idea: "bg-gray-100 text-gray-600",
    hot_contender: "bg-orange-100 text-orange-700",
    chosen: "bg-blue-100 text-blue-700",
    booked: "bg-green-100 text-green-700",
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-gray-50">
      <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-900 truncate">{card.title}</h4>
          <Badge
            variant="secondary"
            className={`text-xs ${stageColors[card.stage] ?? ""}`}
          >
            {card.stage.replace("_", " ")}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
          {card.start_time && (
            <span>{card.start_time.slice(0, 5)}</span>
          )}
          {card.duration_minutes > 0 && (
            <span>{card.duration_minutes}min</span>
          )}
          {card.location && <span>{card.location}</span>}
          {card.budget > 0 && (
            <span className="text-green-600 font-medium">
              ${Number(card.budget).toFixed(0)}
            </span>
          )}
        </div>

        {card.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {card.description}
          </p>
        )}
      </div>
    </div>
  );
}
