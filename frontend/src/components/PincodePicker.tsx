"use client";

import { useEffect, useState } from "react";
import { MapPin, MapPinned, Search } from "lucide-react";
import { usePincode } from "@/lib/pincode-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import type { PincodeInfo } from "@/lib/types";

export function PincodePicker({ onDone }: { onDone?: () => void }) {
  const { setPincode, resolveFromGps, gpsState } = usePincode();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PincodeInfo[]>([]);

  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 3) return;
    const handle = setTimeout(() => {
      api.get<PincodeInfo[]>(`/api/pincodes/search?q=${encodeURIComponent(trimmedQuery)}`).then(setResults).catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(handle);
  }, [trimmedQuery]);

  const displayResults = trimmedQuery.length < 3 ? [] : results;

  function choose(info: PincodeInfo) {
    setPincode(info);
    onDone?.();
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={async () => {
          await resolveFromGps();
          onDone?.();
        }}
        disabled={gpsState === "loading"}
        className="w-full"
      >
        <MapPinned size={17} />
        {gpsState === "loading" ? "Finding you..." : "Use my current location"}
      </Button>
      {gpsState === "denied" && (
        <p className="-mt-2 text-xs text-foreground/50">Location permission denied — search your town or pincode below.</p>
      )}
      {gpsState === "error" && <p className="-mt-2 text-xs text-foreground/50">Couldn&apos;t find that — try searching below.</p>}

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-foreground/35">OR</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <div className="relative">
        <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/35" />
        <input
          type="text"
          placeholder="Search town or pincode, e.g. Kondagaon"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl bg-surface py-3 pl-10 pr-3 text-sm shadow-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-brand"
        />
      </div>

      {displayResults.length > 0 && (
        <ul className="flex flex-col divide-y divide-border overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border">
          {displayResults.map((r) => (
            <li key={`${r.pincode}-${r.locality}`}>
              <button onClick={() => choose(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-brand-soft/40">
                <MapPin size={16} className="shrink-0 text-foreground/35" />
                <span>
                  <span className="font-medium">{r.locality}</span>{" "}
                  <span className="text-foreground/45">
                    {r.locality.toLowerCase() === r.city.toLowerCase() ? "" : `${r.city}, `}
                    {r.state} · {r.pincode}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
