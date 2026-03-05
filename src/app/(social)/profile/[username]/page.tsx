"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { ProfileCard } from "@/components/social/profile-card";
import { AdventurePostCard } from "@/components/social/adventure-post-card";
import type { Profile, AdventurePost } from "@/types";

export default function ProfilePage() {
  const params = useParams();
  const username = params.username as string;
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<AdventurePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, postsRes] = await Promise.all([
          fetch(`/api/profiles/${username}`),
          fetch(`/api/adventures/user/${username}`),
        ]);

        const profileData = await profileRes.json();
        const postsData = await postsRes.json();

        if (profileData.data) {
          setProfile(profileData.data);
        } else {
          setError("Profile not found");
        }

        if (postsData.data) {
          setPosts(postsData.data);
        }
      } catch {
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="bg-white rounded-lg h-40 border mb-6" />
            <div className="grid gap-4">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-lg h-64 border" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            {error || "Profile not found"}
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <ProfileCard
          profile={profile}
          currentUserId={user?.id}
        />

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Adventures ({posts.length})
          </h2>

          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border">
              <p className="text-gray-500">No adventures published yet</p>
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post) => (
                <AdventurePostCard
                  key={post.id}
                  post={post}
                  showAuthor={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
