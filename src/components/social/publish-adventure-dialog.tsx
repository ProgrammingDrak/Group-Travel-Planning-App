"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TagInput } from "./tag-input";
import type { AdventureVisibility } from "@/types";

interface PublishAdventureDialogProps {
  tripId: string;
  tripName: string;
}

export function PublishAdventureDialog({ tripId, tripName }: PublishAdventureDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [caption, setCaption] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [visibility, setVisibility] = useState<AdventureVisibility>("public");
  const [taggedUsernames, setTaggedUsernames] = useState<string[]>([]);

  async function handlePublish() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/adventures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trip_id: tripId,
          caption,
          cover_image_url: coverImageUrl,
          visibility,
          tagged_usernames: taggedUsernames,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to publish");
        setLoading(false);
        return;
      }

      setOpen(false);
      router.push(`/adventure/${data.data.id}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Share Adventure
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publish Adventure</DialogTitle>
          <DialogDescription>
            Share &quot;{tripName}&quot; with the community. Your itinerary and budget breakdown
            will be visible so others can get inspired!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="caption">Caption</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tell people about this trip..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover_image">Cover Image URL</Label>
            <Input
              id="cover_image"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as AdventureVisibility)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public — anyone can see</SelectItem>
                <SelectItem value="followers">Followers only</SelectItem>
                <SelectItem value="private">Private — only you</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tag Travelers</Label>
            <TagInput value={taggedUsernames} onChange={setTaggedUsernames} />
          </div>

          <Button onClick={handlePublish} disabled={loading} className="w-full">
            {loading ? "Publishing..." : "Publish Adventure"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
