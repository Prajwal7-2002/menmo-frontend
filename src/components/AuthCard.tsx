"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FullPageSpinner, Logo } from "./ui";

/** Layout for login/signup; sends already-logged-in users to the chat. */
export function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const { ready, loggedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && loggedIn) router.replace("/chat");
  }, [ready, loggedIn, router]);

  if (!ready || loggedIn) return <FullPageSpinner />;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo size={34} />
        </div>
        <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-muted">{subtitle}</p>
          {children}
        </div>
      </div>
    </main>
  );
}
