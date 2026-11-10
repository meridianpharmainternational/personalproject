import type { Metadata } from "next";
import { getApprovedReviews } from "@/lib/reviews";
import { pageMeta } from "@/lib/seo";
import { site } from "@/lib/site";
import { ReviewCard } from "@/components/reviews/review-card";
import { ReviewForm } from "@/components/reviews/review-form";

export const metadata: Metadata = pageMeta(
  "/reviews",
  "Customer reviews",
  `Reviews from importers and distributors who buy from ${site.fullName}. Every review is checked by our team before it is published.`,
);

/**
 * /reviews: every published review, then the form to write one (#write, linked
 * from the home carousel). New reviews wait for an admin (app/admin/reviews)
 * before they appear here.
 */
export default async function ReviewsPage() {
  const reviews = await getApprovedReviews();

  return (
    <>
      <header className="page-head">
        <div className="container-grid">
          <h1 className="max-w-4xl">Customer reviews</h1>
          <p className="lead mt-4">
            What importers and distributors say about ordering from us. Our team checks every review before it is
            published.
          </p>
        </div>
      </header>

      {reviews.length > 0 && (
        <section className="section" aria-labelledby="reviews-list">
          <div className="container-grid">
            <h2 id="reviews-list" className="sr-only">
              Published reviews
            </h2>
            <ul className="rv-grid">
              {reviews.map((r) => (
                <li key={r.id} className="flex">
                  <ReviewCard review={r} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section id="write" className="section surface-paper scroll-mt-24" aria-labelledby="write-title">
        <div className="container-grid grid-12 items-start gap-y-8">
          <div className="col-span-full lg:col-span-4">
            <h2 id="write-title">Write a review</h2>
            <p className="lead mt-3">
              {reviews.length > 0
                ? "Bought from us? Tell other importers how it went."
                : "Bought from us? Be the first to tell other importers how it went."}
            </p>
            <p className="mt-4 text-fg-muted">
              Rate us, add a few sentences and, if you like, a photo. Your review appears here once our team has checked
              it.
            </p>
          </div>
          <div className="panel col-span-full lg:col-span-7 lg:col-start-6">
            <ReviewForm />
          </div>
        </div>
      </section>
    </>
  );
}
