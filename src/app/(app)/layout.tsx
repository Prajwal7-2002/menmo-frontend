"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChartColumn, FileText, LogOut, Menu, MessageSquare, Settings, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { FullPageSpinner, Logo } from "@/components/ui";

const NAV = [
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: ChartColumn },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, loggedIn, username, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (ready && !loggedIn) router.replace("/login");
  }, [ready, loggedIn, router]);

  if (!ready || !loggedIn) return <FullPageSpinner />;

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-3">
      <div className="mb-5 px-2 pt-1">
        <Logo />
      </div>
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
              active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
      <div className="mt-auto border-t border-border pt-3">
        <div className="truncate px-3 pb-2 text-xs text-muted">
          Signed in as <span className="font-medium text-fg">{username}</span>
        </div>
        <button
          onClick={() => {
            logout();
            router.replace("/login");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <LogOut className="size-4" /> Log out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <aside className="hidden w-56 shrink-0 border-r border-border bg-surface md:block">{nav}</aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-surface shadow-xl">
            <button onClick={() => setMenuOpen(false)} className="absolute top-3 right-3 rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="Close menu">
              <X className="size-5" />
            </button>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-3 py-2 md:hidden">
          <button onClick={() => setMenuOpen(true)} className="rounded-md p-1.5 text-muted hover:bg-surface-2" aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <Logo size={24} />
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
