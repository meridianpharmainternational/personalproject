import type { ReactNode } from "react";

/** Shared shell for legal pages (terms, privacy, disclaimer). */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-clip">
      {/* ---------------- HEADER ---------------- */}
      <section className="bg-mesh relative">
        <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
        <div className="container-page relative py-14 lg:py-20">
          <div className="animate-fade-up max-w-3xl">
            <span className="eyebrow">
              <span className="dot" />
              Legal
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              <span className="gradient-text">{title}</span>
            </h1>
            <p className="mt-4 text-sm text-slate-500">Last updated: TODO</p>
          </div>
        </div>
      </section>

      {/* ---------------- BODY ---------------- */}
      <section className="container-page py-12 lg:py-16">
        <div className="reveal max-w-3xl space-y-6 leading-relaxed text-slate-600">
          {children}
        </div>
      </section>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-lg font-semibold text-brand-900">
        {title}
      </h2>
      <p>{children}</p>
    </section>
  );
}
