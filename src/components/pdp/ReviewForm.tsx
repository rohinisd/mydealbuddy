"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarIcon } from "@/components/icons/Icons";

interface ReviewStatus {
  loggedIn: boolean;
  eligible: boolean;
  existingReview: { rating: number; body: string } | null;
}

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/review-status`)
      .then((r) => r.json())
      .then((data: ReviewStatus) => {
        setStatus(data);
        if (data.existingReview) {
          setRating(data.existingReview.rating);
          setBody(data.existingReview.body);
        }
      })
      .catch(() => setStatus({ loggedIn: false, eligible: false, existingReview: null }));
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Something went wrong.");
        return;
      }
      setMessage("Thanks — your review is live.");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  if (!status) return null;

  if (!status.loggedIn) {
    return (
      <p className="mt-6 rounded-md border border-dashed border-border bg-surface-grey px-4 py-3 text-sm text-text-secondary">
        <Link href={`/login?next=${encodeURIComponent(`/product/${productId}`)}`} className="font-semibold text-accent hover:underline">
          Log in
        </Link>{" "}
        to write a review.
      </p>
    );
  }

  if (!status.eligible) {
    return (
      <p className="mt-6 rounded-md border border-dashed border-border bg-surface-grey px-4 py-3 text-sm text-text-secondary">
        Only customers who&apos;ve purchased this product can leave a review.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 rounded-md border border-border p-4">
      <p className="mb-2 text-sm font-semibold text-text-primary">
        {status.existingReview ? "Update your review" : "Write a review"}
      </p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star} stars`}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="text-rating"
          >
            <StarIcon className={`h-6 w-6 ${(hoverRating || rating) >= star ? "opacity-100" : "opacity-25"}`} />
          </button>
        ))}
      </div>
      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think of this product?"
        rows={3}
        className="mt-3 w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-accent focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="btn-tracking mt-3 rounded-md bg-accent px-5 py-2 text-xs font-bold uppercase text-white hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Submitting..." : status.existingReview ? "Update Review" : "Submit Review"}
      </button>
      {message && <p className="mt-2 text-sm text-text-secondary">{message}</p>}
    </form>
  );
}
