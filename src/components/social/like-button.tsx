"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface LikeButtonProps {
  adventureId: string;
  isLiked: boolean;
  likeCount: number;
}

export function LikeButton({ adventureId, isLiked: initialIsLiked, likeCount: initialCount }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      if (isLiked) {
        await fetch(`/api/adventures/${adventureId}/like`, { method: "DELETE" });
        setIsLiked(false);
        setCount((c) => c - 1);
      } else {
        await fetch(`/api/adventures/${adventureId}/like`, { method: "POST" });
        setIsLiked(true);
        setCount((c) => c + 1);
      }
    } catch {
      // Revert on error
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleToggle}
      disabled={loading}
      className={isLiked ? "text-red-500 hover:text-red-600" : "text-gray-500 hover:text-gray-700"}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isLiked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        className="w-5 h-5 mr-1"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {count}
    </Button>
  );
}
