"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { enquirySchema, type EnquiryInput } from "@/lib/validations/enquiry";
import { submitEnquiry } from "@/lib/actions/enquiry";
import { Field, inputClass } from "@/components/ui/field";

export function EnquiryForm({
  source = "Contact Form",
  product,
  compact = false,
}: {
  source?: string;
  product?: string;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryInput>({
    resolver: zodResolver(enquirySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      country: "",
      company: "",
      product: product ?? "",
      message: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const fd = new FormData();
    (Object.keys(values) as (keyof EnquiryInput)[]).forEach((k) =>
      fd.set(k, values[k] ?? ""),
    );
    fd.set("source", source);
    fd.set("page", pathname ?? "");
    const res = await submitEnquiry(fd);
    if (res.ok) setDone(true);
    else setServerError(res.error ?? "Something went wrong. Please try again.");
  });

  if (done) {
    return (
      <div className="rounded-lg bg-leaf-50 px-4 py-3 text-sm text-leaf-800">
        Thanks — your enquiry has been sent. Our team will get back to you
        shortly.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {serverError && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {serverError}
        </p>
      )}

      {product ? (
        <>
          <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">
            Enquiring about: <span className="font-semibold">{product}</span>
          </div>
          <input type="hidden" {...register("product")} />
        </>
      ) : (
        <Field label="Product of interest (optional)" htmlFor="product">
          <input id="product" className={inputClass} {...register("product")} />
        </Field>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="name" error={errors.name?.message}>
          <input id="name" autoComplete="name" className={inputClass} {...register("name")} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <input id="email" type="email" autoComplete="email" className={inputClass} {...register("email")} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone (optional)" htmlFor="phone" error={errors.phone?.message}>
          <input id="phone" type="tel" autoComplete="tel" className={inputClass} {...register("phone")} />
        </Field>
        <Field label="Country (optional)" htmlFor="country" error={errors.country?.message}>
          <input id="country" autoComplete="country-name" className={inputClass} {...register("country")} />
        </Field>
      </div>

      <Field label="Company (optional)" htmlFor="company" error={errors.company?.message}>
        <input id="company" autoComplete="organization" className={inputClass} {...register("company")} />
      </Field>

      <Field label="Message" htmlFor="message" error={errors.message?.message}>
        <textarea
          id="message"
          rows={compact ? 3 : 5}
          className={inputClass}
          placeholder={
            product
              ? "Quantity, destination market, documentation needs…"
              : "How can we help?"
          }
          {...register("message")}
        />
      </Field>

      <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full">
        {isSubmitting ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
