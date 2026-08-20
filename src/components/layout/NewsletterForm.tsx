"use client";

import { useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "subscribed" | "already_subscribed" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json();
      setStatus(data.result === "already_subscribed" ? "already_subscribed" : "subscribed");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  if (status === "subscribed" || status === "already_subscribed") {
    return (
      <p className="rounded-md border border-dashed border-border bg-white px-3 py-2 text-sm text-text-secondary">
        {status === "subscribed" ? "You're on the list — deals coming your way." : "You're already subscribed."}
      </p>
    );
  }

  return (
    <div>
      <form className="flex gap-2" onSubmit={handleSubmit}>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full rounded-md border border-border-strong bg-white px-3 py-2 text-sm placeholder:text-text-muted focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "submitting"}
          className="btn-tracking shrink-0 rounded-md bg-accent px-4 py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {status === "submitting" ? "..." : "Join"}
        </button>
      </form>
      {status === "error" && <p className="mt-2 text-xs text-discount">Something went wrong — try again.</p>}
    </div>
  );
}
