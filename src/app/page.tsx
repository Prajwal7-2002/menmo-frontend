"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { FullPageSpinner } from "@/components/ui";

export default function Home() {
  const { ready, loggedIn } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (ready) router.replace(loggedIn ? "/chat" : "/login");
  }, [ready, loggedIn, router]);
  return <FullPageSpinner />;
}
