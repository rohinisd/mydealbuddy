"use client";

import { useState } from "react";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-grey p-6 text-sm text-text-secondary">
        Thanks for reaching out — this is a preview form (no backend/email service connected yet), so
        nothing was actually sent. Once Postmark/SES is wired up, this will deliver to support.
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <input required placeholder="Your name" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
        <input required type="email" placeholder="Email address" className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
      </div>
      <input placeholder="Subject" className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
      <textarea required placeholder="How can we help?" rows={5} className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none" />
      <button type="submit" className="btn-tracking rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90">
        Send Message
      </button>
    </form>
  );
}
