"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface TaggedUser {
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface TagInputProps {
  value: string[];
  onChange: (usernames: string[]) => void;
}

export function TagInput({ value, onChange }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TaggedUser[]>([]);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/profiles/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.data) {
          setResults(
            data.data.filter(
              (p: TaggedUser) => !value.includes(p.username)
            )
          );
          setShowResults(true);
        }
      } catch {
        // Ignore search errors
      }
    }, 300);

    return () => clearTimeout(timeoutRef.current);
  }, [query, value]);

  function addTag(username: string) {
    if (!value.includes(username)) {
      onChange([...value, username]);
    }
    setQuery("");
    setShowResults(false);
    inputRef.current?.focus();
  }

  function removeTag(username: string) {
    onChange(value.filter((u) => u !== username));
  }

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map((username) => (
          <Badge key={username} variant="secondary" className="gap-1">
            @{username}
            <button
              type="button"
              onClick={() => removeTag(username)}
              className="ml-1 text-gray-500 hover:text-gray-700"
            >
              x
            </button>
          </Badge>
        ))}
      </div>

      <Input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setShowResults(true)}
        onBlur={() => setTimeout(() => setShowResults(false), 200)}
        placeholder="Search users to tag..."
      />

      {showResults && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {results.map((user) => (
            <button
              key={user.username}
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
              onMouseDown={(e) => {
                e.preventDefault();
                addTag(user.username);
              }}
            >
              <Avatar className="h-6 w-6">
                <AvatarImage src={user.avatar_url} />
                <AvatarFallback className="text-xs">
                  {user.display_name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.display_name}</p>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
