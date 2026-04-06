"use client";

import { useEffect, useRef } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export type LocationItem = {
  id: string;
  title: string;
  image_url: string;
  latitude: number;
  longitude: number;
  captured_at: string | null;
  created_at: string;
};

type MapProps = {
  locations: LocationItem[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

export default function Map({ locations }: MapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey || !mapRef.current || locations.length === 0) {
      return;
    }

    let mounted = true;

    setOptions({
      key: apiKey,
      v: "weekly",
    });

    Promise.all([importLibrary("maps"), importLibrary("marker")]).then(
      ([{ Map }]) => {
        if (!mounted || !mapRef.current) {
          return;
        }

        const map = new Map(mapRef.current, {
          center: {
            lat: locations[0]?.latitude ?? 51.5074,
            lng: locations[0]?.longitude ?? -0.1278,
          },
          zoom: locations.length === 1 ? 10 : 5,
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
        });

        const bounds = new google.maps.LatLngBounds();

        locations.forEach((location) => {
          const position = {
            lat: location.latitude,
            lng: location.longitude,
          };

          bounds.extend(position);

          const marker = new google.maps.Marker({
            map,
            position,
            title: location.title,
          });

          const safeTitle = escapeHtml(location.title);
          const safeUrl = escapeHtml(location.image_url);
          const takenOn = escapeHtml(formatDate(location.captured_at));

          const info = new google.maps.InfoWindow({
            content: `<div style="max-width:220px"><img src="${safeUrl}" alt="${safeTitle}" style="width:100%;border-radius:8px;margin-bottom:8px" /><strong style="display:block;margin-bottom:4px">${safeTitle}</strong><span style="color:#405a72;font-size:12px">${takenOn}</span></div>`,
          });

          marker.addListener("click", () => info.open({ anchor: marker, map }));
        });

        if (!bounds.isEmpty()) {
          map.fitBounds(bounds, 60);
        }
      }
    );

    return () => {
      mounted = false;
    };
  }, [apiKey, locations]);

  return (
    <div className="map" ref={mapRef}>
      {!apiKey && (
        <div className="map-placeholder">
          Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to render the map.
        </div>
      )}
      {apiKey && locations.length === 0 && (
        <div className="map-placeholder">Upload a sky image to create your first pin.</div>
      )}
    </div>
  );
}
