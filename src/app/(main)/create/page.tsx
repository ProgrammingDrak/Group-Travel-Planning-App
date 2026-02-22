"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { storeParticipant } from "@/hooks/use-participant";
import { Header } from "@/components/layout/header";
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
import { Plane, Loader2, ArrowLeft } from "lucide-react";
import { LocationAutocomplete } from "@/components/ui/location-autocomplete";
import Link from "next/link";

export default function CreateTripPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [creatorEmail, setCreatorEmail] = useState("");
  const [creatorFirstName, setCreatorFirstName] = useState("");
  const [creatorLastName, setCreatorLastName] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          destination,
          start_date: startDate,
          end_date: endDate,
          total_budget: parseFloat(totalBudget) || 0,
          creator_email: creatorEmail,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create trip");
      }

      const { data: trip } = await res.json();

      // Update the creator participant with proper name
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: participant } = await supabase
        .from("participants")
        .update({
          first_name: creatorFirstName || "Creator",
          last_name: creatorLastName || "",
        })
        .eq("trip_id", trip.id)
        .eq("email", creatorEmail)
        .select()
        .single();

      if (participant) {
        storeParticipant({
          participant_id: participant.id,
          trip_id: trip.id,
          email: participant.email,
          first_name: participant.first_name,
          last_name: participant.last_name,
          is_organizer: true,
        });
      }

      router.push(`/trip/${trip.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container max-w-2xl py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Plane className="h-5 w-5 text-primary" />
              <CardTitle>Create a New Trip</CardTitle>
            </div>
            <CardDescription>
              Set up your trip details and invite your travel group to start planning together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
              {/* Trip details */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Trip Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="name">Trip Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Summer Europe Adventure"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">Destination</Label>
                  <LocationAutocomplete
                    id="destination"
                    value={destination}
                    onChange={setDestination}
                    onSelect={(s) => setDestination(s.name)}
                    placeholder="Search for a destination..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Estimated Total Budget ($)</Label>
                  <Input
                    id="budget"
                    type="number"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(e.target.value)}
                    placeholder="5000"
                    min="0"
                    step="100"
                  />
                </div>
              </div>

              {/* Creator info */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground">Your Info (Organizer)</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="creatorFirstName">First Name</Label>
                    <Input
                      id="creatorFirstName"
                      value={creatorFirstName}
                      onChange={(e) => setCreatorFirstName(e.target.value)}
                      placeholder="Jane"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creatorLastName">Last Name</Label>
                    <Input
                      id="creatorLastName"
                      value={creatorLastName}
                      onChange={(e) => setCreatorLastName(e.target.value)}
                      placeholder="Doe"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="creatorEmail">Email</Label>
                  <Input
                    id="creatorEmail"
                    type="email"
                    value={creatorEmail}
                    onChange={(e) => setCreatorEmail(e.target.value)}
                    placeholder="jane@example.com"
                    required
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Trip...
                  </>
                ) : (
                  "Create Trip"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
