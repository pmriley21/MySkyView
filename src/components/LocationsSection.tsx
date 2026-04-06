"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Map, { LocationItem } from "./Map";

function formatDate(value: string | null) {
  if (!value) {
    return "Date not available";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Date not available";
  }

  return parsed.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function LocationsSection() {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");

  useEffect(() => {
    const loadLocations = () => {
      setStatus("loading");
      fetch("/api/locations")
        .then(async (response) => {
          const data = (await response.json()) as {
            locations?: LocationItem[];
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "Could not load sky views.");
          }

          return data;
        })
        .then((data) => {
          setLocations(data.locations ?? []);
          setStatus("idle");
        })
        .catch(() => setStatus("error"));
    };

    const onUploaded = () => loadLocations();
    window.addEventListener("sky-view:uploaded", onUploaded);
    loadLocations();

    return () => {
      window.removeEventListener("sky-view:uploaded", onUploaded);
    };
  }, []);

  const listTitle = useMemo(() => {
    if (status === "loading") {
      return "Loading your sky views...";
    }
    if (status === "error") {
      return "Could not load views right now.";
    }
    if (locations.length === 0) {
      return "No sky views yet. Upload your first one.";
    }
    return `Showing ${locations.length} sky ${locations.length === 1 ? "view" : "views"}`;
  }, [locations.length, status]);

  return (
    <section className="section">
      <div className="section-header">
        <h2>Sky map</h2>
        <p>Each upload reads GPS metadata and appears as a map pin.</p>
      </div>

      <div className="map-grid">
        <div className="map-shell">
          <Map locations={locations} />
        </div>

        <aside className="location-list">
          <h3>Recent uploads</h3>
          <p className="form-help">{listTitle}</p>

          <ul>
            {locations.slice(0, 10).map((location) => (
              <li key={location.id}>
                <Image
                  src={location.image_url}
                  alt={location.title}
                  width={88}
                  height={66}
                />
                <div>
                  <strong>{location.title}</strong>
                  <span>{formatDate(location.captured_at ?? location.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </section>
  );
}
