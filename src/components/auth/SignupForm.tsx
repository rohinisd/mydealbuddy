"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/my-account";
  const ref = searchParams.get("ref") || "";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/account/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password, ref }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4">
      <h1 className="mb-6 text-xl font-semibold text-text-primary">Create an Account</h1>
      {ref && (
        <p className="mb-4 rounded-md border border-dashed border-discount bg-surface-soft px-3 py-2 text-xs text-text-secondary">
          You&apos;re signing up with referral code <span className="font-semibold">{ref}</span> — you&apos;ll both earn Buddy Coins
          after your first order.
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex gap-3">
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="w-1/2 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="w-1/2 rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 8 characters)"
          className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={submitting}
          className="btn-tracking w-full rounded-md bg-accent py-2.5 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Creating account..." : "Create Account"}
        </button>
        {error && <p className="text-sm text-discount">{error}</p>}
      </form>
      <p className="mt-4 text-center text-sm text-text-secondary">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-accent hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
