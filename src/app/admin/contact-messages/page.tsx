"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ContactMessageRow } from "@/lib/contact-messages";

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/contact-messages");
    setMessages(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="mx-auto max-w-[900px] px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Contact Messages</h1>
        <Link href="/admin" className="text-sm font-semibold text-text-secondary hover:text-accent">
          ← Products
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-text-muted">Loading...</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-text-muted">No messages yet.</p>
      ) : (
        <div className="divide-y divide-border rounded-md border border-border">
          {messages.map((m) => (
            <div key={m.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-text-primary">
                    {m.name} <span className="font-normal text-text-muted">&lt;{m.email}&gt;</span>
                  </p>
                  {m.subject && <p className="text-sm text-text-secondary">{m.subject}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      m.emailSent ? "bg-surface-soft text-accent-ink" : "bg-surface-grey text-discount"
                    }`}
                  >
                    {m.emailSent ? "Emailed" : "Email failed"}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(m.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">{m.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
