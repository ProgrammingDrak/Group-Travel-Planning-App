"use client";

import type { Profile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FollowButton } from "./follow-button";
import Link from "next/link";

interface ProfileCardProps {
  profile: Profile;
  currentUserId?: string;
  showFollowButton?: boolean;
}

export function ProfileCard({ profile, currentUserId, showFollowButton = true }: ProfileCardProps) {
  const initials = profile.display_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const isOwnProfile = currentUserId === profile.id;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start gap-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile.avatar_url} alt={profile.display_name} />
          <AvatarFallback className="text-lg">{initials}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 truncate">
                {profile.display_name}
              </h2>
              <p className="text-gray-500">@{profile.username}</p>
            </div>
            {showFollowButton && !isOwnProfile && currentUserId && (
              <FollowButton
                profileId={profile.id}
                isFollowing={profile.is_following ?? false}
              />
            )}
          </div>

          {profile.bio && (
            <p className="mt-2 text-gray-700">{profile.bio}</p>
          )}

          <div className="mt-3 flex gap-4 text-sm">
            <Link
              href={`/profile/${profile.username}`}
              className="text-gray-600 hover:text-gray-900"
            >
              <span className="font-semibold text-gray-900">
                {profile.follower_count ?? 0}
              </span>{" "}
              followers
            </Link>
            <Link
              href={`/profile/${profile.username}`}
              className="text-gray-600 hover:text-gray-900"
            >
              <span className="font-semibold text-gray-900">
                {profile.following_count ?? 0}
              </span>{" "}
              following
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
