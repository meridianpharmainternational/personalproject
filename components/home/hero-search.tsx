"use client";

import { useId, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { startNavigationProgress } from "@/components/navigation-progress";

/**
 * Hero search (home). A plain GET form to /medicines, so it works without JS;
 * with JS it drops empty fields (no `?category=&q=`) and navigates client-side.
 * The category select is desktop-only (hidden < 640px by `.hero-search` CSS).
 * The placeholder is one short string that fits the narrowest input box at every
 * width: about 200px at 320, and about 210px at 1024, where the form sits in 7 of
 * 12 columns beside the 11rem select. The sr-only label carries the full wording.
 */
const NARROW = "(max-width: 639.98px)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(NARROW);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}
const getNarrow = () => window.matchMedia(NARROW).matches;
const getServerNarrow = () => false;

export function HeroSearch({ categories }: { categories: { slug: string; name: string }[] }) {
  const router = useRouter();
  const narrow = useSyncExternalStore(subscribe, getNarrow, getServerNarrow);
  const id = useId();
  const catId = `${id}-category`;
  const qId = `${id}-q`;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    // The select is hidden on narrow screens, so never apply a value the buyer can't see.
    const category = narrow ? "" : String(data.get("category") ?? "").trim();
    const q = String(data.get("q") ?? "").trim();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    const qs = params.toString();
    const href = qs ? `/medicines?${qs}` : "/medicines";
    startNavigationProgress(href);
    router.push(href);
  };

  return (
    <form
      className="hero-search mt-8"
      method="get"
      action="/medicines"
      role="search"
      aria-label="Search the catalogue"
      onSubmit={onSubmit}
    >
      {categories.length > 0 && (
        <>
          <label htmlFor={catId} className="sr-only">
            Category
          </label>
          <select id={catId} name="category" defaultValue="">
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </>
      )}
      <label htmlFor={qId} className="sr-only">
        Search by product, molecule or strength
      </label>
      <input
        id={qId}
        name="q"
        type="search"
        placeholder="Product or molecule"
        autoComplete="off"
        enterKeyHint="search"
        maxLength={120}
      />
      <button type="submit" className="btn btn-enquire" aria-label="Search">
        <Search aria-hidden strokeWidth={1.75} />
        <span className="btn-label">Search</span>
      </button>
    </form>
  );
}
