"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ContactMessageRow } from "@/lib/contact-messages";

export default function ContactMessagesPage() {
  const [messages, setMessages] = useState<ContactMessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/contact-messages");
    setMessages(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSendReply(id: string) {
    const message = (replyDrafts[id] ?? "").trim();
    if (!message) return;

    setSendingId(id);
    setErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const res = await fetch(`/api/admin/contact-messages/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [id]: data.error || "Failed to send reply." }));
        return;
      }
      setReplyDrafts((prev) => ({ ...prev, [id]: "" }));
      await load();
    } catch {
      setErrors((prev) => ({ ...prev, [id]: "Network error -- reply wasn't sent." }));
    } finally {
      setSendingId(null);
    }
  }

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

              {m.repliedAt ? (
                <div className="mt-3 rounded-md border border-border bg-surface-grey p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                    Replied {new Date(m.repliedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-text-secondary">{m.replyMessage}</p>
                </div>
              ) : (
                <div className="mt-3">
                  <textarea
                    rows={3}
                    value={replyDrafts[m.id] ?? ""}
                    onChange={(e) => setReplyDrafts((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder={`Reply to ${m.name}...`}
                    className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
                  />
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      disabled={sendingId === m.id || !(replyDrafts[m.id] ?? "").trim()}
                      onClick={() => handleSendReply(m.id)}
                      className="btn-tracking rounded-md bg-accent px-3 py-1.5 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
                    >
                      {sendingId === m.id ? "Sending…" : "Send Reply"}
                    </button>
                    {errors[m.id] && <p className="text-xs text-discount">{errors[m.id]}</p>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
