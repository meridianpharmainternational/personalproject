"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { useEnquiryList } from "@/lib/enquiry-list";
import { AddToEnquiry } from "@/components/enquiry/add-to-enquiry";
import type { CatalogItem } from "@/lib/catalog";
import { keepTogether, moleculeLabel } from "@/lib/format";
import { emphStrength, tagStrengths } from "@/components/catalog/catalog-model";

/** Strengths named before the "+N" remainder. */
const MAX_STRENGTHS = 3;

/**
 * Product card: photo, name, molecule, one line of strengths and Add. The
 * title link's ::after covers the whole card (one big tap target to the
 * product page); the Add button sits above it. In the enquiry list the card
 * gets a green border. Only "Made to order" is flagged (most products are in
 * stock). Strengths the buyer filtered or searched for come first.
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
  const more = s.length - MAX_STRENGTHS;
  const strengths = s.slice(0, MAX_STRENGTHS).map((x) => keepTogether(x.value)).join(", ");
  const molecule = moleculeLabel(item.molecule, item.ester);

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
        {item.availability !== "in-stock" && <span className="pcard-flag badge badge-mto">Made to order</span>}
      </div>

      <div className="pcard-body">
        <h3 className="pcard-title">
          <Link href={`/medicines/${item.id}`}>{item.name}</Link>
        </h3>
        {molecule && <p className="pcard-molecule">{molecule}</p>}
        {strengths && (
          <p className="pcard-strengths">
            {strengths}
            {more > 0 && <span className="whitespace-nowrap"> +{more} more</span>}
          </p>
        )}
        <div className="pcard-actions">
          <AddToEnquiry product={item} strength={emphStrength(item.strengths, emph)} />
        </div>
      </div>
    </article>
  );
}
