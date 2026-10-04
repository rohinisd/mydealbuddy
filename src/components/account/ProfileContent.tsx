"use client";

import { useState } from "react";
import type { Customer } from "@/lib/customers";

export function ProfileContent({ initialCustomer }: { initialCustomer: Pick<Customer, "firstName" | "lastName" | "email" | "emailVerifiedAt" | "hasPassword"> }) {
  const [firstName, setFirstName] = useState(initialCustomer.firstName);
  const [lastName, setLastName] = useState(initialCustomer.lastName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState<string | null>(null);

  const [email, setEmail] = useState(initialCustomer.email);
  const [emailVerified, setEmailVerified] = useState(initialCustomer.emailVerifiedAt != null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);

  const [hasPassword, setHasPassword] = useState(initialCustomer.hasPassword);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    setNameSaving(true);
    setNameMessage(null);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const data = await res.json();
      setNameMessage(res.ok ? "Saved." : data.error || "Failed to save.");
    } finally {
      setNameSaving(false);
    }
  }

  async function handleSaveEmail(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() === initialCustomer.email.toLowerCase()) return;
    setEmailSaving(true);
    setEmailMessage(null);
    try {
      const res = await fetch("/api/account/email", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailMessage(data.error || "Failed to save.");
        return;
      }
      setEmailVerified(false);
      setEmailMessage("Email updated -- check your inbox to verify it.");
    } finally {
      setEmailSaving(false);
    }
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordSaving(true);
    setPasswordMessage(null);
    try {
      const res = await fetch("/api/account/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: hasPassword ? currentPassword : undefined, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage(data.error || "Failed to save.");
        return;
      }
      setHasPassword(true);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordMessage(hasPassword ? "Password changed." : "Password set -- you can now also log in with email and password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleSaveName} className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">Name</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={nameSaving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {nameSaving ? "Saving..." : "Save"}
          </button>
          {nameMessage && <p className="text-sm text-text-secondary">{nameMessage}</p>}
        </div>
      </form>

      <form onSubmit={handleSaveEmail} className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">Email</h2>
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full max-w-sm rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <p className="mt-2 text-xs text-text-muted">
          {emailVerified ? "Verified." : "Not verified -- check your inbox for a verification link."}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={emailSaving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {emailSaving ? "Saving..." : "Save"}
          </button>
          {emailMessage && <p className="text-sm text-text-secondary">{emailMessage}</p>}
        </div>
      </form>

      <form onSubmit={handleSavePassword} className="rounded-md border border-border p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-text-muted">Password</h2>
        {!hasPassword && (
          <p className="mb-3 text-xs text-text-muted">
            Your account doesn&apos;t have a password yet (you signed in with Google). Set one to also be able to log in with email and password.
          </p>
        )}
        <div className="flex flex-col gap-3 sm:max-w-sm">
          {hasPassword && (
            <input
              required
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
          )}
          <input
            required
            type="password"
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={hasPassword ? "New password" : "New password (min 8 characters)"}
            className="rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
          >
            {passwordSaving ? "Saving..." : hasPassword ? "Change Password" : "Set Password"}
          </button>
          {passwordMessage && <p className="text-sm text-text-secondary">{passwordMessage}</p>}
        </div>
      </form>
    </div>
  );
}
