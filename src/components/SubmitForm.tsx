"use client";

import { useState } from "react";

export default function SubmitForm() {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const isDisabled = status === "loading" || title.trim().length < 2 || !file;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setStatus("error");
      setMessage("Choose an image file first.");
      return;
    }

    setStatus("loading");
    setMessage("");

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("image", file);

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }

      setStatus("success");
      setMessage("Uploaded. Your sky view is now pinned on the map.");
      setTitle("");
      setFile(null);
      const input = document.getElementById("image") as HTMLInputElement | null;
      if (input) {
        input.value = "";
      }
      window.dispatchEvent(new Event("sky-view:uploaded"));
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  };

  return (
    <form className="form-card" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label className="form-field" htmlFor="title">
          <span>Title</span>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Evening clouds in the park"
            maxLength={120}
            required
          />
        </label>

        <label className="form-field" htmlFor="image">
          <span>Sky photo</span>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const nextFile = event.target.files?.[0] ?? null;
              setFile(nextFile);
            }}
            required
          />
          <p className="form-help">
            Keep location + date/time metadata enabled on your camera. Max upload size: 25 MB.
          </p>
        </label>
      </div>

      <div className="form-actions">
        <button className="primary-button" type="submit" disabled={isDisabled}>
          {status === "loading" ? "Uploading..." : "Upload sky view"}
        </button>
        <p className={`form-message form-message--${status === "error" ? "error" : "success"}`}>
          {message || "Requires EXIF GPS + capture date/time. Image is resized to 800px wide."}
        </p>
      </div>
    </form>
  );
}
