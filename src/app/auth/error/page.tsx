import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f7f8f4] px-5 text-[#151712]">
      <div className="w-full max-w-md rounded-lg border border-[#d9decf] bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#596153]">
          League Office
        </p>
        <h1 className="mt-4 text-3xl font-semibold">Sign-in did not finish.</h1>
        <p className="mt-3 text-base leading-7 text-[#596153]">
          The Google sign-in callback failed or expired. Try again from the login
          screen.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-[#182214] px-4 text-sm font-semibold text-white"
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
