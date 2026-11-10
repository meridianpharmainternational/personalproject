import { Star } from "lucide-react";
import type { PublicReview } from "@/lib/reviews";

/** Five stars, the first `rating` filled; screen readers hear "Rated 4 out of 5". */
export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span className={`rv-stars ${className}`} role="img" aria-label={`Rated ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={n <= rating ? "is-on" : undefined} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

/** "Anna Kowalska" -> "AK": the avatar for a review without a photo. */
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** The reviewer's photo, or their initials on a navy tint. Decorative: the name is next to it. */
export function Avatar({
  name,
  photoUrl,
  className = "",
}: {
  name: string;
  photoUrl: string | null;
  className?: string;
}) {
  return photoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- a 512px upload shown at 48px; already small
    <img
      src={photoUrl}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      className={`rv-avatar ${className}`}
    />
  ) : (
    <span className={`rv-avatar ${className}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/**
 * One published review: rating and month, the review, and who wrote it. Used by
 * the home carousel and the /reviews grid, so both read the same.
 */
export function ReviewCard({ review }: { review: PublicReview }) {
  const from = [review.company, review.country].filter(Boolean).join(" · ");
  return (
    <article className="rv-card">
      <div className="flex items-center justify-between gap-3">
        <Stars rating={review.rating} />
        <p className="rv-date">{review.date}</p>
      </div>
      <blockquote className="rv-quote">
        <p>“{review.comment}”</p>
      </blockquote>
      <footer className="rv-by">
        <Avatar name={review.name} photoUrl={review.photoUrl} />
        <div className="min-w-0">
          <p className="rv-name">{review.name}</p>
          {from && <p className="rv-meta">{from}</p>}
        </div>
      </footer>
    </article>
  );
}
