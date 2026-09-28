"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { login } from "@/app/login/actions";
import { Field, inputClass } from "@/components/ui/field";

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const fd = new FormData();
    fd.set("email", values.email);
    fd.set("password", values.password);
    const result = await login(fd);
    if (result?.error) setServerError(result.error);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {serverError && (
        <p className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {serverError}
        </p>
      )}

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={inputClass}
          {...register("email")}
        />
      </Field>

      <Field label="Password" htmlFor="password" error={errors.password?.message}>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
          {...register("password")}
        />
      </Field>

      <button
        type="submit"
        disabled={isSubmitting}
        className="btn btn-primary w-full py-2.5"
      >
        {isSubmitting ? "Signing in…" : "Log in"}
      </button>
    </form>
  );
}
