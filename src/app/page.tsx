import Link from "next/link";
import { Plane, Users, Calendar, DollarSign, Vote, MessageSquare } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Plane className="h-5 w-5 text-primary" />
            <span className="text-lg">TripSync</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Templates
            </Link>
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Create Trip
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container">
        <section className="py-20 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
            Plan trips together,{" "}
            <span className="text-primary">democratically</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            TripSync helps small groups collaboratively plan every detail of their
            trip — from activities and restaurants to budgets and schedules. Vote,
            discuss, and decide together.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-8 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Planning
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium h-11 px-8 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              Browse Templates
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
          <FeatureCard
            icon={<Calendar className="h-6 w-6" />}
            title="Timeline Planning"
            description="Organize activities day-by-day with drag-and-drop scheduling. See travel times and conflicts at a glance."
          />
          <FeatureCard
            icon={<Vote className="h-6 w-6" />}
            title="Democratic Voting"
            description="Everyone votes on activities. The group's favorites rise to the top so nobody gets left out."
          />
          <FeatureCard
            icon={<DollarSign className="h-6 w-6" />}
            title="Budget Tracking"
            description="Track expenses, split costs, and settle up. See category breakdowns and export reports."
          />
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6" />}
            title="Real-time Comments"
            description="Discuss options, react with emojis, and @mention friends. Changes appear instantly for everyone."
          />
          <FeatureCard
            icon={<Users className="h-6 w-6" />}
            title="Easy Invites"
            description="Share an invite link and friends can join in seconds. No account needed, just name and email."
          />
          <FeatureCard
            icon={<Plane className="h-6 w-6" />}
            title="Route Overview"
            description="Visualize your daily route with transportation modes, travel times, and schedule conflict detection."
          />
        </section>

        {/* How it works */}
        <section className="py-16 text-center max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-8">How It Works</h2>
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                1
              </div>
              <h3 className="font-semibold mb-1">Create a Trip</h3>
              <p className="text-sm text-muted-foreground">
                Set your destination, dates, and budget. Get a shareable invite link.
              </p>
            </div>
            <div>
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                2
              </div>
              <h3 className="font-semibold mb-1">Invite Your Group</h3>
              <p className="text-sm text-muted-foreground">
                Share the link. Friends join instantly — no signup required.
              </p>
            </div>
            <div>
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mx-auto mb-3">
                3
              </div>
              <h3 className="font-semibold mb-1">Plan Together</h3>
              <p className="text-sm text-muted-foreground">
                Add activities, vote on favorites, track expenses — all in real-time.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <div className="container">
          TripSync — Collaborative trip planning for groups. Built with Next.js &amp;
          Supabase.
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <div className="text-primary">{icon}</div>
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
