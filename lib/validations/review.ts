import { z } from "zod";

/**
 * Customer review form (/reviews). Shared by the form (react-hook-form) and
 * submitReview, so the limits a buyer sees are the ones the server enforces.
 *
 * The review itself is kept short on purpose: a few sentences fit a carousel
 * card without truncation, and essays or pasted marketing copy do not. Links are
 * refused (the usual payload of review spam). Every check carries its own
 * message: submitReview returns the first issue's message to the buyer as-is.
 */
export const REVIEW_LIMITS = {
  name: 60,
  company: 80,
  country: 60,
  email: 254,
  commentMin: 20,
  comment: 300,
  /** Largest photo the server accepts. The form resizes photos to 512px first, so real uploads stay far below. */
  photoBytes: 2 * 1024 * 1024,
} as const;

/** "Please keep <what> to <n> characters or fewer." for a string max check. */
const tooLong = (what: string, n: number) => `Please keep ${what} to ${n} characters or fewer.`;

/** Spaces and line breaks collapsed, so a review cannot be padded into a wall of blank lines. */
export const tidyComment = (s: string) => s.replace(/\s+/g, " ").trim();

const LINK = /(https?:\/\/|www\.)/i;

export const reviewSchema = z.object({
  rating: z.coerce
    .number({ invalid_type_error: "Please choose a star rating." })
    .int("Please choose a star rating.")
    .min(1, "Please choose a star rating.")
    .max(5, "Please choose a star rating."),
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name.")
    .max(REVIEW_LIMITS.name, tooLong("your name", REVIEW_LIMITS.name)),
  company: z.string().trim().max(REVIEW_LIMITS.company, tooLong("the company name", REVIEW_LIMITS.company)),
  country: z.string().trim().max(REVIEW_LIMITS.country, tooLong("the country name", REVIEW_LIMITS.country)),
  email: z
    .string()
    .trim()
    .max(REVIEW_LIMITS.email, tooLong("your email address", REVIEW_LIMITS.email))
    .refine((v) => v === "" || z.string().email().safeParse(v).success, {
      message: "Please enter a valid email address, like name@company.com, or leave it empty.",
    }),
  comment: z
    .string()
    .transform(tidyComment)
    .pipe(
      z
        .string()
        .min(REVIEW_LIMITS.commentMin, `Please write at least ${REVIEW_LIMITS.commentMin} characters.`)
        .max(REVIEW_LIMITS.comment, tooLong("your review", REVIEW_LIMITS.comment))
        .refine((v) => !LINK.test(v), { message: "Please leave links out of your review." }),
    ),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please confirm that we may publish your review." }),
  }),
});

export type ReviewInput = z.input<typeof reviewSchema>;
export type ReviewValues = z.output<typeof reviewSchema>;
