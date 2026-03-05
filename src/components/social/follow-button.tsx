"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface FollowButtonProps {
  profileId: string;
  isFollowing: boolean;
}

export function FollowButton({ profileId, isFollowing: initialIsFollowing }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (isFollowing) {
        await fetch(`/api/follows?following_id=${profileId}`, {
          method: "DELETE",
        });
        setIsFollowing(false);
      } else {
        await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ following_id: profileId }),
        });
        setIsFollowing(true);
      }
    } catch {
      // Revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
