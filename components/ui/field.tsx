import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

/** Shared input class (maps to the .input component class in globals.css). */
export const inputClass = "input";

/** Id of a field's help text, derived from the control id. */
export const fieldHelpId = (id: string) => `${id}-help`;
/** Id of a field's error message, derived from the control id. */
export const fieldErrorId = (id: string) => `${id}-err`;

export type FieldAria = {
  id: string;
  "aria-invalid"?: true;
  "aria-describedby"?: string;
};

/**
 * The id + aria wiring for a control: `aria-invalid` while it has an error and
 * `aria-describedby` pointing at the help text and error message that <Field/>
 * renders. Spread it onto the input/select/textarea.
 */
export function fieldAria(
  id: string,
  { error, hint }: { error?: string | null; hint?: ReactNode } = {},
): FieldAria {
  const describedBy = [hint ? fieldHelpId(id) : null, error ? fieldErrorId(id) : null]
    .filter(Boolean)
    .join(" ");
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy || undefined,
  };
}

/**
 * Label + optional help text + error message around a form control.
 *
 * Backwards compatible: `children` may be the control itself (wire the aria
 * yourself, e.g. with `fieldAria()`), or a render function that receives the
 * id/aria props to spread onto the control:
 *
 *   <Field label="Email" htmlFor={id} error={err}>{(a) => <input {...a} className="input" />}</Field>
 */
export function Field({
  label,
  htmlFor,
  error,
  hint,
  optional = false,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string | null;
  hint?: ReactNode;
  /** Adds a muted "(optional)" after the label. Required fields are not starred. */
  optional?: boolean;
  className?: string;
  children: ReactNode | ((aria: FieldAria) => ReactNode);
}) {
  const control =
    typeof children === "function" ? children(fieldAria(htmlFor, { error, hint })) : children;

  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="label">
        {label}
        {optional && (
          <>
            {" "}
            <span className="opt">(optional)</span>
          </>
        )}
      </label>
      {control}
      {hint && (
        <p id={fieldHelpId(htmlFor)} className="field-help">
          {hint}
        </p>
      )}
      {error && (
        <p id={fieldErrorId(htmlFor)} className="field-error">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-none" strokeWidth={1.75} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
