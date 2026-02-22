"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LocationSuggestion {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: { name: string; address: string }) => void;
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a location...",
  id,
  className,
  disabled,
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounced search using OpenStreetMap Nominatim
  const searchLocations = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=0`,
        {
          headers: {
            "Accept": "application/json",
          },
        }
      );

      if (response.ok) {
        const data: LocationSuggestion[] = await response.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setHighlightIndex(-1);
      }
    } catch {
      // Silently fail - user can still type manually
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      searchLocations(value);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, searchLocations]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: LocationSuggestion) => {
    const shortName = suggestion.display_name.split(",")[0].trim();
    onChange(shortName);
    setIsOpen(false);
    if (onSelect) {
      onSelect({
        name: shortName,
        address: suggestion.display_name,
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className={cn("pl-8 pr-8", className)}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.lat}-${suggestion.lon}`}
              type="button"
              className={cn(
                "w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-start gap-2",
                highlightIndex === index && "bg-accent"
              )}
              onClick={() => handleSelect(suggestion)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{suggestion.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
