"use client";

import { useMemo, useState } from "react";
import type { LocationItem } from "./Map";

type RangeKey = "7d" | "30d" | "90d" | "365d" | "all";
type Bucket = "day" | "week" | "month";

type RangeOption = {
  key: RangeKey;
  label: string;
  bucket: Bucket;
  days: number | null;
};

type BucketPoint = {
  key: string;
  label: string;
  count: number;
};

const rangeOptions: RangeOption[] = [
  { key: "7d", label: "7d", bucket: "day", days: 7 },
  { key: "30d", label: "30d", bucket: "day", days: 30 },
  { key: "90d", label: "90d", bucket: "week", days: 90 },
  { key: "365d", label: "365d", bucket: "month", days: 365 },
  { key: "all", label: "All", bucket: "month", days: null },
];

function parseCapturedDate(value: string | null) {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(value: Date) {
  const copy = new Date(value);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function startOfWeek(value: Date) {
  const dayStart = startOfDay(value);
  const dayOfWeek = dayStart.getDay();
  const mondayOffset = (dayOfWeek + 6) % 7;
  dayStart.setDate(dayStart.getDate() - mondayOffset);
  return dayStart;
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function toBucketStart(value: Date, bucket: Bucket) {
  if (bucket === "day") return startOfDay(value);
  if (bucket === "week") return startOfWeek(value);
  return startOfMonth(value);
}

function addBucketStep(value: Date, bucket: Bucket) {
  const next = new Date(value);
  if (bucket === "day") next.setDate(next.getDate() + 1);
  else if (bucket === "week") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function bucketKey(value: Date, bucket: Bucket) {
  if (bucket === "month") {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}`;
  }
  return value.toISOString().slice(0, 10);
}

function bucketLabel(value: Date, bucket: Bucket) {
  if (bucket === "day") {
    return value.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  if (bucket === "week") {
    return `Wk ${value.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  }
  return value.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
}

type ActivityChartProps = {
  locations: LocationItem[];
};

export default function ActivityChart({ locations }: ActivityChartProps) {
  const [range, setRange] = useState<RangeKey>("30d");
  const selectedRange = rangeOptions.find((option) => option.key === range) ?? rangeOptions[1];

  const data = useMemo(() => {
    const capturedDates = locations
      .map((location) => parseCapturedDate(location.captured_at))
      .filter((value): value is Date => value !== null);

    if (capturedDates.length === 0) {
      return {
        points: [] as BucketPoint[],
        total: 0,
        max: 0,
      };
    }

    const now = new Date();
    const defaultStart = selectedRange.days
      ? startOfDay(new Date(now.getTime() - (selectedRange.days - 1) * 24 * 60 * 60 * 1000))
      : toBucketStart(
          new Date(Math.min(...capturedDates.map((value) => value.getTime()))),
          selectedRange.bucket
        );

    const start = defaultStart;
    const end = toBucketStart(now, selectedRange.bucket);

    const counts = new Map<string, number>();
    for (const date of capturedDates) {
      if (date < start) {
        continue;
      }
      const bucketStart = toBucketStart(date, selectedRange.bucket);
      const key = bucketKey(bucketStart, selectedRange.bucket);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const points: BucketPoint[] = [];
    let pointer = toBucketStart(start, selectedRange.bucket);
    while (pointer <= end) {
      const key = bucketKey(pointer, selectedRange.bucket);
      points.push({
        key,
        label: bucketLabel(pointer, selectedRange.bucket),
        count: counts.get(key) ?? 0,
      });
      pointer = addBucketStep(pointer, selectedRange.bucket);
    }

    const max = points.reduce((acc, point) => Math.max(acc, point.count), 0);
    const total = points.reduce((acc, point) => acc + point.count, 0);

    return { points, total, max };
  }, [locations, selectedRange.bucket, selectedRange.days]);

  return (
    <section className="activity-card">
      <div className="activity-header">
        <h3>Sky View Activity</h3>
        <div className="activity-range">
          {rangeOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`range-pill ${range === option.key ? "range-pill--active" : ""}`}
              onClick={() => setRange(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {data.points.length === 0 ? (
        <p className="form-help">No dated image metadata found yet.</p>
      ) : (
        <>
          <p className="form-help">Total uploads in range: {data.total}</p>
          <div className="activity-graph" role="img" aria-label="Upload activity over time">
            {data.points.map((point) => {
              const heightPercent = data.max > 0 ? (point.count / data.max) * 100 : 0;
              return (
                <div className="activity-bar-wrap" key={point.key} title={`${point.label}: ${point.count}`}>
                  <div className="activity-bar-track">
                    <div className="activity-bar" style={{ height: `${Math.max(heightPercent, point.count > 0 ? 8 : 0)}%` }} />
                  </div>
                  <span className="activity-label">{point.label}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

