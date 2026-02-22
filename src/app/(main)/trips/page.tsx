"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isFuture, isToday } from "date-fns";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plane,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  ArrowLeft,
  Clock,
} from "lucide-react";

interface TripWithCount {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  total_budget: number;
  participant_count: number;
  created_at: string;
}

type SortOption = "soonest" | "budget_high" | "budget_low" | "newest" | "name";

export default function TripsPage() {
  const [trips, setTrips] = useState<TripWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("soonest");

  useEffect(() => {
    // Get email from any stored participant session
    const email = getStoredEmail();
    if (!email) {
      setLoading(false);
      return;
    }

    fetch(`/api/trips/by-email?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.data) {
          setTrips(result.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, past } = useMemo(() => {
    const upcomingTrips: TripWithCount[] = [];
    const pastTrips: TripWithCount[] = [];

    for (const trip of trips) {
      const endDate = parseISO(trip.end_date);
      if (isPast(endDate) && !isToday(endDate)) {
        pastTrips.push(trip);
      } else {
        upcomingTrips.push(trip);
      }
    }

    return { upcoming: upcomingTrips, past: pastTrips };
  }, [trips]);

  const sortTrips = (list: TripWithCount[]) => {
    const sorted = [...list];
    switch (sortBy) {
      case "soonest":
        sorted.sort(
          (a, b) =>
            new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
        break;
      case "budget_high":
        sorted.sort((a, b) => Number(b.total_budget) - Number(a.total_budget));
        break;
      case "budget_low":
        sorted.sort((a, b) => Number(a.total_budget) - Number(b.total_budget));
        break;
      case "newest":
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  };

  const getDaysUntil = (startDate: string) => {
    const start = parseISO(startDate);
    const now = new Date();
    const diff = Math.ceil(
      (start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diff === 0) return "Today!";
    if (diff === 1) return "Tomorrow";
    if (diff < 0) return `${Math.abs(diff)} days ago`;
    return `${diff} days away`;
  };

  const isCurrentTrip = (trip: TripWithCount) => {
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    return (
      (isFuture(end) || isToday(end)) &&
      (isPast(start) || isToday(start))
    );
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container max-w-4xl py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Plane className="h-6 w-6 text-primary" />
              My Trips
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              All your planned trips in one place
            </p>
          </div>
          <Select
            value={sortBy}
            onValueChange={(v) => setSortBy(v as SortOption)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="soonest">Soonest Upcoming</SelectItem>
              <SelectItem value="budget_high">Highest Budget</SelectItem>
              <SelectItem value="budget_low">Lowest Budget</SelectItem>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="name">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16">
            <Plane className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              No trips yet. Create your first trip to get started!
            </p>
            <Link href="/create">
              <Button className="mt-4">Create Trip</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Upcoming trips */}
            {upcoming.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Upcoming Trips ({upcoming.length})
                </h2>
                <div className="space-y-3">
                  {sortTrips(upcoming).map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isCurrent={isCurrentTrip(trip)}
                      daysUntil={getDaysUntil(trip.start_date)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past trips */}
            {past.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-5 w-5" />
                  Past Trips ({past.length})
                </h2>
                <div className="space-y-3">
                  {sortTrips(past).map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      isPast
                      daysUntil={getDaysUntil(trip.start_date)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function TripCard({
  trip,
  isCurrent = false,
  isPast = false,
  daysUntil,
}: {
  trip: TripWithCount;
  isCurrent?: boolean;
  isPast?: boolean;
  daysUntil: string;
}) {
  return (
    <Link href={`/trip/${trip.id}`}>
      <Card
        className={`hover:shadow-md transition-shadow cursor-pointer ${
          isCurrent ? "border-primary border-2" : ""
        } ${isPast ? "opacity-70" : ""}`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Plane className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{trip.name}</h3>
              {isCurrent && (
                <Badge className="bg-primary text-primary-foreground text-[10px]">
                  Active Now
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {trip.destination}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(parseISO(trip.start_date), "MMM d")} -{" "}
                {format(parseISO(trip.end_date), "MMM d, yyyy")}
              </span>
              {Number(trip.total_budget) > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  {Number(trip.total_budget).toLocaleString()}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {trip.participant_count}
              </span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span
              className={`text-xs font-medium ${
                isCurrent
                  ? "text-primary"
                  : isPast
                  ? "text-muted-foreground"
                  : "text-foreground"
              }`}
            >
              {daysUntil}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Get email from any stored participant session in localStorage
function getStoredEmail(): string | null {
  if (typeof window === "undefined") return null;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith("tripsync_participant_")) {
        const data = JSON.parse(localStorage.getItem(key) || "");
        if (data?.email) return data.email;
      }
    }
  } catch {
    // ignore
  }
  return null;
}
