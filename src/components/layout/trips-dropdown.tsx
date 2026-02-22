"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plane, MapPin, Calendar, ChevronDown, ArrowRight } from "lucide-react";

interface TripSummary {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
}

export function TripsDropdown() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = getStoredEmail();
    if (!email) {
      setLoading(false);
      return;
    }

    fetch(`/api/trips/by-email?email=${encodeURIComponent(email)}`)
      .then((res) => res.json())
      .then((result) => {
        if (result.data) {
          // Filter to upcoming trips, sort by closest start date, cap at 5
          const upcoming = (result.data as TripSummary[])
            .filter((t) => {
              const endDate = parseISO(t.end_date);
              return !isPast(endDate) || isToday(endDate);
            })
            .sort(
              (a, b) =>
                new Date(a.start_date).getTime() -
                new Date(b.start_date).getTime()
            )
            .slice(0, 5);
          setTrips(upcoming);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || trips.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Plane className="h-4 w-4" />
          <span className="hidden sm:inline">Trips</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        {trips.map((trip) => (
          <DropdownMenuItem key={trip.id} asChild className="cursor-pointer">
            <Link href={`/trip/${trip.id}`} className="flex flex-col items-start gap-0.5 py-2">
              <span className="font-medium text-sm truncate w-full">
                {trip.name}
              </span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" />
                  {trip.destination}
                </span>
                <span className="flex items-center gap-0.5">
                  <Calendar className="h-3 w-3" />
                  {format(parseISO(trip.start_date), "MMM d")}
                </span>
              </div>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link
            href="/trips"
            className="flex items-center justify-center gap-1 text-sm text-primary"
          >
            View All Trips
            <ArrowRight className="h-3 w-3" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
