import Link from "next/link";
import { verifyEmailToken } from "@/lib/customers";

export const metadata = { title: "Verify Email | MyDealBuddy" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : { ok: false, reason: "No verification token was provided." };

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-4 text-center">
      <h1 className="text-xl font-semibold text-text-primary">{result.ok ? "Email Verified" : "Verification Failed"}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        {result.ok ? "Your email address has been verified." : result.reason}
      </p>
      <Link
        href="/my-account"
        className="btn-tracking mt-6 inline-block rounded-md bg-accent px-6 py-2.5 text-sm font-bold uppercase text-white hover:opacity-90"
      >
        Go to My Account
      </Link>
    </div>
  );
}
