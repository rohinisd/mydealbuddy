"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

function AddCardForm({ onSaved, onError }: { onSaved: () => void; onError: (message: string) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    if (!stripe || !elements) return;
    onError("");
    setSubmitting(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        onError(submitError.message || "Please check your card details.");
        return;
      }
      const res = await fetch("/api/account/payment-methods/setup-intent", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || "Something went wrong saving your card.");
        return;
      }
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        clientSecret: data.clientSecret,
        confirmParams: { return_url: `${window.location.origin}/account/payment-methods` },
        redirect: "if_required",
      });
      if (confirmError) {
        onError(confirmError.message || "Could not save this card.");
        return;
      }
      onSaved();
    } catch {
      onError("Something went wrong saving your card.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <PaymentElement />
      <button
        type="button"
        disabled={submitting || !stripe}
        onClick={handleSave}
        className="btn-tracking rounded-md bg-accent px-4 py-2 text-sm font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Saving..." : "Save Card"}
      </button>
    </div>
  );
}

export function PaymentMethodsContent({ initialMethods }: { initialMethods: SavedPaymentMethod[] }) {
  const [methods, setMethods] = useState(initialMethods);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function reload() {
    const res = await fetch("/api/account/payment-methods");
    if (res.ok) setMethods(await res.json());
  }

  async function handleRemove(id: string) {
    if (!confirm("Remove this card?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/account/payment-methods/${id}`, { method: "DELETE" });
      if (res.ok) {
        setMethods((prev) => prev.filter((m) => m.id !== id));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove card.");
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      {methods.length === 0 ? (
        <p className="text-sm text-text-muted">No saved cards yet.</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {methods.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="capitalize text-text-primary">
                {m.brand} •••• {m.last4}{" "}
                <span className="text-text-muted">
                  exp {String(m.expMonth).padStart(2, "0")}/{m.expYear}
                </span>
              </span>
              <button
                type="button"
                disabled={busyId === m.id}
                onClick={() => handleRemove(m.id)}
                className="rounded-md border border-discount px-3 py-1.5 text-xs font-semibold text-discount hover:bg-discount/10 disabled:opacity-60"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-discount">{error}</p>}

      {!stripePromise ? (
        <p className="text-sm text-text-muted">Card payments aren&apos;t connected yet.</p>
      ) : adding ? (
        <div className="rounded-md border border-border p-4">
          <Elements stripe={stripePromise} options={{ mode: "setup", currency: "usd", paymentMethodTypes: ["card"] }}>
            <AddCardForm
              onSaved={() => {
                setAdding(false);
                reload();
              }}
              onError={setError}
            />
          </Elements>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setAdding(true);
          }}
          className="rounded-md border border-border-strong px-4 py-2 text-sm font-semibold text-text-primary hover:border-accent"
        >
          + Add a Card
        </button>
      )}
    </div>
  );
}
