"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { AdventurePostCard } from "@/components/social/adventure-post-card";
import type { AdventurePost } from "@/types";
import Link from "next/link";

export default function FeedPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [posts, setPosts] = useState<AdventurePost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeed() {
      try {
        const res = await fetch("/api/adventures");
        const data = await res.json();
        if (data.data) {
          setPosts(data.data);
        }
      } catch {
        // Handle error
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchFeed();
    }
  }, [authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg h-64 border" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Adventure Feed</h1>
          {profile && (
            <Link
              href={`/profile/${profile.username}`}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              My Profile
            </Link>
          )}
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-lg border">
            <h3 className="text-lg font-medium text-gray-900">No adventures yet</h3>
            <p className="mt-2 text-gray-500">
              {user
                ? "Follow other travelers to see their adventures here, or publish your own trips!"
                : "Sign up to follow travelers and see their adventures."}
            </p>
            {!user && (
              <div className="mt-4 flex gap-2 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Log In
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => (
              <AdventurePostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
