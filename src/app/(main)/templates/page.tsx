"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Calendar,
  DollarSign,
  Copy,
  Plus,
  Plane,
  ArrowLeft,
  Loader2,
  Star,
  Users,
  MessageSquare,
  ThumbsUp,
} from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import Link from "next/link";
import type { Trip } from "@/types";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    async function fetchTemplates() {
      const { data } = await supabase
        .from("trips")
        .select("*")
        .eq("is_template", true)
        .order("created_at", { ascending: false });

      setTemplates(data || []);
      setLoading(false);
    }

    fetchTemplates();
  }, [supabase]);

  const handleUseTemplate = async (template: Trip) => {
    // Duplicate the template as a new trip
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          destination: template.destination,
          start_date: template.start_date,
          end_date: template.end_date,
          total_budget: template.total_budget,
          creator_email: "template@tripsync.app",
        }),
      });

      if (res.ok) {
        const { data: newTrip } = await res.json();
        // Copy cards from template
        const { data: templateCards } = await supabase
          .from("cards")
          .select("*")
          .eq("trip_id", template.id);

        if (templateCards && templateCards.length > 0) {
          const newCards = templateCards.map(
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            ({ id, trip_id, created_by, created_at, updated_at, ...card }) => ({
              ...card,
              trip_id: newTrip.id,
            })
          );
          await supabase.from("cards").insert(newCards);
        }

        router.push(`/trip/${newTrip.id}`);
      }
    } catch {
      // Handle error silently for MVP
    }
  };

  const handleLaunchDemo = async () => {
    setDemoLoading(true);
    setDemoError(null);
    try {
      const res = await fetch("/api/seed-demo");
      const data = await res.json();
      if (!res.ok) {
        setDemoError(data.error || "Failed to create demo trip");
        return;
      }
      router.push(data.redirect);
    } catch {
      setDemoError("Failed to create demo trip. Check your Supabase connection.");
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container max-w-5xl py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Trip Templates</h1>
            <p className="text-muted-foreground mt-1">
              Browse public templates to jumpstart your trip planning.
            </p>
          </div>
          <Link href="/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create from Scratch
            </Button>
          </Link>
        </div>

        {/* Demonstration Template — always shown */}
        <div className="mb-8">
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Featured Demo</h2>
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-background hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="default" className="text-xs">
                      <Star className="h-3 w-3 mr-1" />
                      Demo
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">Tennessee Adventure 2026</CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    Tennessee, USA
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                See TripSync in action! Three friends (Sarah, Jake &amp; Emily) plan a 3-day
                Tennessee road trip — Nashville honky tonks, a full day at Dollywood, and a Smoky
                Mountains hike. Complete with votes, debates, comments, expenses, and a final itinerary.
              </p>

              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  3 days
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  $3,000 budget
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  3 travelers
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  30 comments
                </Badge>
                <Badge variant="secondary" className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" />
                  30+ votes
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="font-medium text-foreground">Day 1 — Nashville</p>
                  <p>Hot Chicken, Honky Tonks, Airbnb in The Gulch</p>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="font-medium text-foreground">Day 2 — Dollywood</p>
                  <p>Full day at the park, Old Mill dinner</p>
                </div>
                <div className="bg-muted/50 rounded-md p-2">
                  <p className="font-medium text-foreground">Day 3 — Smokies</p>
                  <p>Pancake Pantry, Clingmans Dome hike</p>
                </div>
              </div>

              {demoError && (
                <p className="text-sm text-destructive">{demoError}</p>
              )}

              <Button
                className="w-full"
                size="lg"
                onClick={handleLaunchDemo}
                disabled={demoLoading}
              >
                {demoLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Demo Trip...
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 mr-2" />
                    Launch Demonstration
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Community Templates */}
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Community Templates</h2>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <Plane className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
            <h3 className="text-base font-medium mb-1">No community templates yet</h3>
            <p className="text-sm text-muted-foreground">
              Create a trip and share it as a template for others!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => {
              const days =
                template.start_date && template.end_date
                  ? differenceInDays(
                      parseISO(template.end_date),
                      parseISO(template.start_date)
                    ) + 1
                  : 0;

              return (
                <Card
                  key={template.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {template.destination}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {days} day{days !== 1 ? "s" : ""}
                      </Badge>
                      {Number(template.total_budget) > 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />$
                          {Number(template.total_budget).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleUseTemplate(template)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Use This Template
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
