"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { storeParticipant } from "@/hooks/use-participant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plane, Calendar, MapPin, Users, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Trip } from "@/types";

export default function JoinTripPage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.invite_code as string;

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [participantCount, setParticipantCount] = useState(0);

  const supabase = createClient();

  useEffect(() => {
    async function fetchTrip() {
      try {
        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("*")
          .eq("invite_code", inviteCode)
          .single();

        if (tripError || !tripData) {
          setError("Trip not found. The invite link may be invalid or expired.");
          return;
        }

        setTrip(tripData);

        const { count } = await supabase
          .from("participants")
          .select("*", { count: "exact", head: true })
          .eq("trip_id", tripData.id);

        setParticipantCount(count || 0);
      } catch {
        setError("Failed to load trip details.");
      } finally {
        setLoading(false);
      }
    }

    fetchTrip();
  }, [inviteCode, supabase]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    setJoining(true);
    try {
      // Check if already a participant
      const { data: existing } = await supabase
        .from("participants")
        .select("*")
        .eq("trip_id", trip.id)
        .eq("email", email)
        .single();

      if (existing) {
        // Already joined - store session and redirect
        storeParticipant({
          participant_id: existing.id,
          trip_id: trip.id,
          email: existing.email,
          first_name: existing.first_name,
          last_name: existing.last_name,
          is_organizer: existing.is_organizer,
        });
        router.push(`/trip/${trip.id}`);
        return;
      }

      // Create new participant
      const { data: participant, error: joinError } = await supabase
        .from("participants")
        .insert({
          trip_id: trip.id,
          first_name: firstName,
          last_name: lastName,
          email: email,
          is_organizer: false,
        })
        .select()
        .single();

      if (joinError) {
        if (joinError.code === "23505") {
          setError("You've already joined this trip with this email.");
        } else {
          throw joinError;
        }
        return;
      }

      // Store session
      storeParticipant({
        participant_id: participant.id,
        trip_id: trip.id,
        email: participant.email,
        first_name: participant.first_name,
        last_name: participant.last_name,
        is_organizer: false,
      });

      router.push(`/trip/${trip.id}`);
    } catch {
      setError("Failed to join the trip. Please try again.");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Plane className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/")}
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Plane className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Join Trip</CardTitle>
          <CardDescription>You&apos;ve been invited to join a trip!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trip info */}
          {trip && (
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <h3 className="font-semibold text-lg">{trip.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {trip.destination}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {format(parseISO(trip.start_date), "MMM d")} —{" "}
                {format(parseISO(trip.end_date), "MMM d, yyyy")}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                {participantCount} participant{participantCount !== 1 ? "s" : ""} so far
              </div>
            </div>
          )}

          {/* Join form */}
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Jane"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={joining}>
              {joining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Trip"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
