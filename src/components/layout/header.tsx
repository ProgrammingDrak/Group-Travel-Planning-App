"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useParticipant } from "@/hooks/use-participant";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plane, Copy, Users, Library, ChevronDown, Compass, User, LogOut } from "lucide-react";
import { TripsDropdown } from "@/components/layout/trips-dropdown";
import type { Trip } from "@/types";

interface HeaderProps {
  trip?: Trip | null;
  onOpenLibrary?: () => void;
  onInvite?: () => void;
}

export function Header({ trip, onOpenLibrary, onInvite }: HeaderProps) {
  const { participant } = useParticipant();
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = async () => {
    if (!trip) return;
    const url = `${window.location.origin}/join/${trip.invite_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
  };

  const profileInitials = profile
    ? profile.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "";

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
          {/* Social nav links */}
          <Link href="/feed">
            <Button variant="ghost" size="sm" className="gap-1">
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">Feed</span>
            </Button>
          </Link>

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

          {/* Auth-aware user menu */}
          {!authLoading && user && profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-xs">{profileInitials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  <span className="font-medium">{profile.display_name}</span>
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <span className="text-muted-foreground">@{profile.username}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/profile/${profile.username}`} className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/feed" className="flex items-center gap-2">
                    <Compass className="h-4 w-4" />
                    Adventure Feed
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : !authLoading && !user ? (
            <>
              {/* Show participant menu if in a trip context */}
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/signup">Create Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/login">Sign In</Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* Show login/signup if not in trip context and no participant */}
              {!participant && !trip && (
                <div className="flex items-center gap-1">
                  <Link href="/login">
                    <Button variant="ghost" size="sm">Log In</Button>
                  </Link>
                  <Link href="/signup">
                    <Button size="sm">Sign Up</Button>
                  </Link>
                </div>
              )}
            </>
          ) : null}

          {!trip && !user && (
            <div className="flex items-center gap-2">
              <TripsDropdown />
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

          {!trip && user && (
            <div className="flex items-center gap-2">
              <TripsDropdown />
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
