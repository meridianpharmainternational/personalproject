import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Logo } from "@/components/logo";

export const metadata: Metadata = {
  title: "Admin sign in",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectedFrom?: string }>;
}) {
  const sp = await searchParams;

  return (
    <div className="bg-paper border-b border-rule">
      <div className="container-grid flex min-h-[70vh] items-center justify-center py-12 lg:py-20">
        <div className="panel w-full max-w-md p-6 sm:p-8">
          <Logo />
          <h1 className="mt-8 text-h2">Admin sign in</h1>
          <p className="mt-2 text-fg-muted">Sign in to manage medicines and review enquiries.</p>

          {sp.redirectedFrom && (
            <p
              role="status"
              className="mt-6 rounded-sm border border-navy-100 border-l-4 border-l-navy-900 bg-navy-50 px-4 py-3 font-medium text-navy-900"
            >
              Please sign in to continue.
            </p>
          )}

          <div className="mt-6">
            <LoginForm />
          </div>

          <p className="mt-6 flex items-start gap-2 border-t border-rule pt-4 text-sm text-fg-muted">
            <ShieldCheck aria-hidden="true" className="mt-0.5 h-[18px] w-[18px] flex-none text-navy-700" />
            <span>Admin access only. Accounts are created by the site owner.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
