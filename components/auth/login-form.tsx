"use client";

import { useEffect, useId, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { login, type LoginResult } from "@/app/login/actions";

export function LoginForm() {
  const uid = useId();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // A failed sign-in moves focus to the error summary so it is announced.
  useEffect(() => {
    if (serverError) summaryRef.current?.focus();
  }, [serverError]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("password", values.password);
    let result: LoginResult | undefined;
    try {
      result = await login(fd);
    } catch (e) {
      // A successful sign-in rejects with Next's redirect error; let it through
      // so the router navigates. Anything else (network drop, stale action ID
      // after a redeploy, 5xx) gets a message and the button resets.
      unstable_rethrow(e);
      setServerError("We couldn’t reach the server. Please try again.");
      return;
    }
    if (result?.error) setServerError(result.error);
  });

  const emailId = `${uid}-email`;
  const passwordId = `${uid}-password`;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate aria-busy={isSubmitting || undefined}>
      {serverError && (
        <div ref={summaryRef} tabIndex={-1} role="alert" className="error-summary">
          <p className="font-semibold">Sign-in failed</p>
          <p className="mt-1">{serverError}</p>
        </div>
      )}

      <div>
        <label htmlFor={emailId} className="label">
          Email
        </label>
        <input
          id={emailId}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          className="input"
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${emailId}-err` : undefined}
          {...register("email")}
        />
        {errors.email?.message && (
          <p id={`${emailId}-err`} className="field-error">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
            {errors.email.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={passwordId} className="label">
          Password
        </label>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="input pr-12"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? `${passwordId}-err` : undefined}
            {...register("password")}
          />
          <button
            type="button"
            className="icon-btn icon-btn-bare absolute right-0.5 top-0.5"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-controls={passwordId}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {errors.password?.message && (
          <p id={`${passwordId}-err`} className="field-error">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
            {errors.password.message}
          </p>
        )}
      </div>

      <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-lg btn-block">
        {isSubmitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
