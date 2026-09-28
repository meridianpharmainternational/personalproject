import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";

export const metadata = { title: "Admin login" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string }>;
}) {
  const sp = await searchParams;

  return (
    <section className="bg-mesh relative">
      <div className="pointer-events-none absolute inset-0 bg-plus opacity-90" />
      <div className="container-page relative flex min-h-[70vh] items-center justify-center py-16 lg:py-24">
        <div className="w-full max-w-md animate-fade-up">
          <div className="flex flex-col items-center text-center">
            <Logo />
            <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight text-brand-900">
              Admin <span className="gradient-text">login</span>
            </h1>
            <p className="mt-2 text-slate-600">
              Sign in to manage medicines and view enquiries.
            </p>
          </div>

          {sp.redirectedFrom && (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              Please sign in to continue.
            </p>
          )}

          <div className="card mt-6 p-6 sm:p-8">
            <LoginForm />
          </div>

          <p className="mt-6 text-center text-xs text-slate-500">
            Admin access only. Accounts are created by the site owner.
          </p>
        </div>
      </div>
    </section>
  );
}
