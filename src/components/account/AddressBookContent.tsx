"use client";

import { useState } from "react";
import { SHIPPING_COUNTRIES } from "@/data/countries";
import type { CustomerAddress } from "@/lib/customer-addresses";

interface Draft {
  label: string;
  fullName: string;
  phone: string;
  countryCode: string;
  city: string;
  province: string;
  addressLine: string;
  zip: string;
}

const EMPTY_DRAFT: Draft = { label: "", fullName: "", phone: "", countryCode: "US", city: "", province: "", addressLine: "", zip: "" };

export function AddressBookContent({ initialAddresses }: { initialAddresses: CustomerAddress[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/account/addresses");
    setAddresses(await res.json());
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setMessage(null);
    try {
      const country = SHIPPING_COUNTRIES.find((c) => c.code === draft.countryCode)?.label ?? draft.countryCode;
      const res = await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: draft.label,
          fullName: draft.fullName,
          phone: draft.phone,
          countryCode: draft.countryCode,
          country,
          province: draft.province,
          city: draft.city,
          addressLine: draft.addressLine,
          zip: draft.zip,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Failed: ${data.error}`);
        return;
      }
      setDraft(EMPTY_DRAFT);
      await refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleSetDefault(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setDefault: true }),
      });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {message && <p className="mb-4 text-sm text-text-secondary">{message}</p>}

      {addresses.length === 0 ? (
        <p className="text-sm text-text-muted">No saved addresses yet.</p>
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="rounded-md border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-text-secondary">
                  <p className="font-semibold text-text-primary">
                    {a.label ? `${a.label} — ` : ""}
                    {a.fullName}
                  </p>
                  <p>{a.addressLine}</p>
                  <p>
                    {a.city}
                    {a.province ? `, ${a.province}` : ""} {a.zip ?? ""}
                  </p>
                  <p>{a.country}</p>
                  {a.phone && <p>{a.phone}</p>}
                </div>
                {a.isDefault && (
                  <span className="shrink-0 rounded-full bg-surface-soft px-2 py-0.5 text-xs font-semibold text-accent-ink">
                    Default
                  </span>
                )}
              </div>
              <div className="mt-3 flex gap-2">
                {!a.isDefault && (
                  <button
                    type="button"
                    disabled={busyId === a.id}
                    onClick={() => handleSetDefault(a.id)}
                    className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent disabled:opacity-60"
                  >
                    Set as Default
                  </button>
                )}
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => handleDelete(a.id)}
                  className="rounded-md border border-border-strong px-3 py-1.5 text-xs font-semibold text-discount hover:border-discount disabled:opacity-60"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleAdd} className="mt-6 grid grid-cols-1 gap-3 rounded-md border border-dashed border-border-strong p-4 sm:grid-cols-2">
        <p className="text-xs font-semibold uppercase text-text-muted sm:col-span-2">Add New Address</p>
        <input
          value={draft.label}
          onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          placeholder="Label (e.g. Home, Work) — optional"
          className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
        />
        <input
          required
          value={draft.fullName}
          onChange={(e) => setDraft({ ...draft, fullName: e.target.value })}
          placeholder="Full name"
          className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
        />
        <input
          required
          value={draft.addressLine}
          onChange={(e) => setDraft({ ...draft, addressLine: e.target.value })}
          placeholder="Address"
          className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
        />
        <input
          required
          value={draft.city}
          onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          placeholder="City"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          value={draft.province}
          onChange={(e) => setDraft({ ...draft, province: e.target.value })}
          placeholder="Province / State"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <select
          value={draft.countryCode}
          onChange={(e) => setDraft({ ...draft, countryCode: e.target.value })}
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        >
          {SHIPPING_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          value={draft.zip}
          onChange={(e) => setDraft({ ...draft, zip: e.target.value })}
          placeholder="ZIP / postal code"
          className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          value={draft.phone}
          onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          placeholder="Phone (optional)"
          className="rounded-md border border-border-strong px-3 py-2 text-sm sm:col-span-2 focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={adding}
          className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60 sm:col-span-2"
        >
          {adding ? "Adding..." : "Add Address"}
        </button>
      </form>
    </div>
  );
}
