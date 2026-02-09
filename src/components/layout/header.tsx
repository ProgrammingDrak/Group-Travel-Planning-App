"use client";

import { useState } from "react";
import Link from "next/link";
import { useParticipant } from "@/hooks/use-participant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plane, Copy, Users, Library, ChevronDown } from "lucide-react";
import type { Trip } from "@/types";

interface HeaderProps {
  trip?: Trip | null;
  onOpenLibrary?: () => void;
  onInvite?: () => void;
}

export function Header({ trip, onOpenLibrary, onInvite }: HeaderProps) {
  const { participant } = useParticipant();
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = async () => {
    if (!trip) return;
    const url = `${window.location.origin}/join/${trip.invite_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Plane className="h-5 w-5 text-primary" />
            <span className="text-lg">TripSync</span>
          </Link>
          {trip && (
            <>
              <span className="text-muted-foreground">/</span>
              <span className="font-medium truncate max-w-[200px]">
                {trip.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {trip && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenLibrary}
                className="hidden sm:flex"
              >
                <Library className="h-4 w-4 mr-1" />
                Library
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onInvite || handleCopyInvite}
              >
                {copied ? (
                  "Copied!"
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Invite People</span>
                    <Copy className="h-3 w-3 ml-1 sm:hidden" />
                  </>
                )}
              </Button>
            </>
          )}

          {participant && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">
                    {participant.first_name[0]}
                    {participant.last_name[0]}
                  </div>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  {participant.first_name} {participant.last_name}
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  {participant.email}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!participant && !trip && (
            <div className="flex items-center gap-2">
              <Link href="/templates">
                <Button variant="ghost" size="sm">
                  Templates
                </Button>
              </Link>
              <Link href="/create">
                <Button size="sm">Create Trip</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
