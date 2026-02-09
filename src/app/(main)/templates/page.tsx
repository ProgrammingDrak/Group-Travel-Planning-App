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
} from "lucide-react";
import { parseISO, differenceInDays } from "date-fns";
import Link from "next/link";
import type { Trip } from "@/types";

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

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

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          <div className="text-center py-16">
            <Plane className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No templates yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to create a trip and share it as a template!
            </p>
            <Link href="/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create a Trip
              </Button>
            </Link>
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
