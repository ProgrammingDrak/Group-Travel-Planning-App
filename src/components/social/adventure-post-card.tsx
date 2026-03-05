"use client";

import Link from "next/link";
import { format } from "date-fns";
import type { AdventurePost } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LikeButton } from "./like-button";

interface AdventurePostCardProps {
  post: AdventurePost;
  showAuthor?: boolean;
}

export function AdventurePostCard({ post, showAuthor = true }: AdventurePostCardProps) {
  const perPerson = post.participant_count && post.trip_budget
    ? Number(post.trip_budget) / post.participant_count
    : null;

  const authorInitials = (post.author_display_name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Cover image */}
      {post.cover_image_url && (
        <Link href={`/adventure/${post.id}`}>
          <div className="aspect-video bg-gray-100 relative overflow-hidden">
            <img
              src={post.cover_image_url}
              alt={post.trip_destination ?? "Adventure"}
              className="w-full h-full object-cover"
            />
          </div>
        </Link>
      )}

      <div className="p-4">
        {/* Author */}
        {showAuthor && (
          <Link
            href={`/profile/${post.author_username}`}
            className="flex items-center gap-2 mb-3"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={post.author_avatar_url} />
              <AvatarFallback className="text-xs">{authorInitials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {post.author_display_name}
              </p>
              <p className="text-xs text-gray-500">@{post.author_username}</p>
            </div>
          </Link>
        )}

        {/* Destination + dates */}
        <Link href={`/adventure/${post.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600">
            {post.trip_destination ?? post.trip_name}
          </h3>
        </Link>

        {post.trip_start_date && post.trip_end_date && (
          <p className="text-sm text-gray-500 mt-1">
            {format(new Date(post.trip_start_date), "MMM d")} -{" "}
            {format(new Date(post.trip_end_date), "MMM d, yyyy")}
          </p>
        )}

        {/* Caption */}
        {post.caption && (
          <p className="mt-2 text-gray-700 text-sm line-clamp-2">{post.caption}</p>
        )}

        {/* Stats */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {post.participant_count && (
            <Badge variant="secondary">
              {post.participant_count} travelers
            </Badge>
          )}
          {perPerson !== null && perPerson > 0 && (
            <Badge variant="outline" className="text-green-700 border-green-300">
              ~${Math.round(perPerson)}/person
            </Badge>
          )}
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <LikeButton
            adventureId={post.id}
            isLiked={post.is_liked ?? false}
            likeCount={post.like_count ?? 0}
          />
          <Link
            href={`/adventure/${post.id}`}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View Itinerary
          </Link>
        </div>
      </div>
    </div>
  );
}
