"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StarIcon } from "@/components/icons/Icons";

interface ReviewPhoto {
  id: string;
  url: string;
}

interface ReviewStatus {
  loggedIn: boolean;
  eligible: boolean;
  existingReview: { id: string; rating: number; body: string; photos: ReviewPhoto[] } | null;
}

const MAX_PHOTOS = 5;

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<ReviewStatus | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ReviewPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [removingPhotoId, setRemovingPhotoId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/products/${productId}/review-status`)
      .then((r) => r.json())
      .then((data: ReviewStatus) => {
        setStatus(data);
        if (data.existingReview) {
          setRating(data.existingReview.rating);
          setBody(data.existingReview.body);
          setReviewId(data.existingReview.id);
          setPhotos(data.existingReview.photos);
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
      setReviewId(data.reviewId);
      setMessage(
        data.coinsEarned > 0
          ? `Thanks — your review is live. You earned ${data.coinsEarned} Buddy Coins!`
          : "Thanks — your review has been updated."
      );
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAddPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !reviewId) return;
    setUploadingPhoto(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch(`/api/reviews/${reviewId}/photos`, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Failed to upload photo.");
        return;
      }
      setPhotos((prev) => [...prev, { id: data.id, url: data.url }]);
      router.refresh();
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto(photoId: string) {
    if (!reviewId) return;
    setRemovingPhotoId(photoId);
    setMessage(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/photos/${photoId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error || "Failed to remove photo.");
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      router.refresh();
    } finally {
      setRemovingPhotoId(null);
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

      {reviewId && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">Photos</p>
          <div className="flex flex-wrap gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt="" className="h-16 w-16 rounded-md border border-border object-cover" />
                <button
                  type="button"
                  disabled={removingPhotoId === photo.id}
                  onClick={() => handleRemovePhoto(photo.id)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-discount text-xs font-bold text-white opacity-0 group-hover:opacity-100 disabled:opacity-60"
                  aria-label="Remove photo"
                >
                  ×
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-md border border-dashed border-border-strong text-xs text-text-muted hover:border-accent">
                {uploadingPhoto ? "..." : "+ Add"}
                <input type="file" accept="image/*" className="hidden" disabled={uploadingPhoto} onChange={handleAddPhoto} />
              </label>
            )}
          </div>
        </div>
      )}

      {message && <p className="mt-2 text-sm text-text-secondary">{message}</p>}
    </form>
  );
}
