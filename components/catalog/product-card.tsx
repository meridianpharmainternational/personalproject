"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEnquiryList } from "@/lib/enquiry-list";
import { AddToEnquiry } from "@/components/enquiry/add-to-enquiry";
import type { CatalogItem } from "@/lib/catalog";
import { keepTogether } from "@/lib/format";
import { tagStrengths } from "@/components/catalog/catalog-model";

/** Strength badges shown before the "+N" overflow badge (spec §6). */
const MAX_STRENGTHS = 3;

/**
 * Grid product card. The title link's ::after covers the whole card (one big
 * tap target to the product page); the Add button sits above it. In the
 * enquiry list the card gets a green border + permanent green top rule.
 * Hover (fine pointers): navy border, top rule slides in, image scales 1.03 —
 * the card itself never moves.
 */
export function ProductCard({
  item,
  compact = false,
  isNew = false,
  index = 0,
  priority = false,
  emph,
}: {
  item: CatalogItem;
  compact?: boolean;
  /** Freshly revealed by "Show more" — plays the staggered rise. */
  isNew?: boolean;
  index?: number;
  priority?: boolean;
  /**
   * Strengths to surface first: norm()'d active strength filters plus the
   * digit-bearing search tokens. Built once per catalogue render, not per card.
   */
  emph?: ReadonlySet<string>;
}) {
  const { items } = useEnquiryList();
  const inList = items.some((i) => i.medicineId === item.id);
  const s = tagStrengths(item.strengths, emph);
  const stock = item.availability === "in-stock";

  return (
    <article
      className={`pcard${inList ? " is-added" : ""}${compact ? " pcard--compact" : ""}${isNew ? " is-new" : ""}`}
      style={isNew ? ({ "--i": Math.min(index, 11) } as CSSProperties) : undefined}
    >
      <div className="pcard-media">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" loading={priority ? "eager" : "lazy"} decoding="async" width={400} height={300} />
        ) : (
          <div className="pcard-ph" aria-hidden="true">
            <span className="pcard-ph-form">{item.form ?? "Product"}</span>
            <span className="pcard-ph-name">{item.name}</span>
          </div>
        )}
        <span className={`pcard-flag badge ${stock ? "badge-stock" : "badge-mto"}`}>
          {stock ? "In stock" : "Made to order"}
        </span>
      </div>

      <div className="pcard-body">
        {item.category && <p className="pcard-cat">{item.category.name}</p>}
        <h3 className="pcard-title">
          <Link href={`/medicines/${item.id}`}>{item.name}</Link>
        </h3>
        {item.molecule && <p className="pcard-molecule">{item.molecule}</p>}
        {s.length > 0 && (
          <div className="pcard-meta">
            {s.slice(0, MAX_STRENGTHS).map((x) => (
              <span key={x.value} className={x.match ? "badge badge-code is-match" : "badge badge-code"}>
                {x.value}
              </span>
            ))}
            {s.length > MAX_STRENGTHS && <span className="badge badge-code">+{s.length - MAX_STRENGTHS}</span>}
          </div>
        )}
        <p className="pcard-spec">
          {[item.form, item.pack && keepTogether(item.pack), item.moq && `MOQ ${keepTogether(item.moq)}`]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <div className="pcard-actions">
          <AddToEnquiry product={item} />
        </div>
      </div>
    </article>
  );
}
