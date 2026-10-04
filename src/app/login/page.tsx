"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { Button, ErrorBox, Spinner, TextField } from "@/components/ui";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(username.trim(), password);
      router.replace("/chat");
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 401 ? "Wrong username or password." : (err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Log in to chat with your documents.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
        <TextField label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />} Log in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
