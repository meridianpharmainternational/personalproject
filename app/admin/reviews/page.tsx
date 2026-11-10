import Link from "next/link";
import { Mail, ShieldAlert } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { REVIEW_STATUSES, listReviews, signedPhotoUrls, type ReviewStatus } from "@/lib/reviews";
import { Avatar, Stars } from "@/components/reviews/review-card";
import { ReviewRowActions } from "@/components/admin/review-row-actions";

export const metadata = { title: "Reviews" };

const TAB_LABEL: Record<ReviewStatus, string> = { pending: "Waiting", approved: "Published", rejected: "Hidden" };
const EMPTY: Record<ReviewStatus, string> = {
  pending: "No reviews are waiting. New reviews from the website appear here first.",
  approved: "No reviews are published yet. Approve a waiting review to show it on the site.",
  rejected: "No hidden reviews.",
};

const submitted = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Review moderation. Every review submitted on /reviews waits here until an
 * admin approves it; approved reviews show on the home carousel and /reviews.
 * Tabs are links (?status=), so each view has its own URL.
 */
export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = REVIEW_STATUSES.find((s) => s === sp.status) ?? "pending";
  const lists = await Promise.all(REVIEW_STATUSES.map((s) => listReviews(s)));
  const byStatus = Object.fromEntries(REVIEW_STATUSES.map((s, i) => [s, lists[i]!])) as Record<
    ReviewStatus,
    Awaited<ReturnType<typeof listReviews>>
  >;
  const reviews = byStatus[tab];
  // Photos come from short-lived signed links: the bucket is private, and waiting photos are never public.
  const photos = await signedPhotoUrls(reviews);

  return (
    <div>
      <header>
        <p className="kicker">Moderation</p>
        <h1 className="mt-2 text-h2">Reviews</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Reviews from the website wait here until you approve them. Approved reviews appear on the home page and the
          Reviews page.
        </p>
      </header>

      <nav aria-label="Review status" className="mt-6">
        <ul className="tabs">
          {REVIEW_STATUSES.map((s) => (
            <li key={s} className="flex flex-none">
              <Link href={`/admin/reviews?status=${s}`} className="tab" aria-current={s === tab ? "page" : undefined}>
                {TAB_LABEL[s]}
                <span className="count">{byStatus[s].length}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {reviews.length === 0 ? (
        <p className="mt-8 text-fg-muted">{EMPTY[tab]}</p>
      ) : (
        <ul className="mt-6 grid gap-4 lg:grid-cols-2">
          {reviews.map((r) => {
            const from = [r.company, r.country].filter(Boolean).join(" · ");
            return (
              <li key={r.id} className="panel flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Stars rating={r.rating} />
                  <p className="text-sm text-fg-muted">Sent {submitted.format(new Date(r.created_at))}</p>
                </div>
                {r.flagged && (
                  <p className="flex items-center gap-2 text-sm font-medium text-danger">
                    <ShieldAlert aria-hidden="true" className="h-4 w-4" />
                    Possible spam: a hidden field meant for bots was filled in.
                  </p>
                )}
                <p className="text-fg">“{r.comment}”</p>
                <div className="flex items-center gap-3 border-t border-rule pt-4">
                  <Avatar name={r.name} photoUrl={photos[r.id] ?? null} />
                  <div className="min-w-0">
                    <p className="font-semibold text-fg-strong">{r.name}</p>
                    {from && <p className="text-sm text-fg-muted">{from}</p>}
                    {r.email && (
                      <a
                        href={`mailto:${r.email}`}
                        className="inline-flex min-h-tap items-center gap-1.5 break-all text-sm text-navy-600 underline"
                      >
                        <Mail aria-hidden="true" className="h-4 w-4 flex-none" />
                        {r.email}
                      </a>
                    )}
                  </div>
                </div>
                <ReviewRowActions id={r.id} status={r.status} name={r.name} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
