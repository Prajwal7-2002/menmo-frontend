"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AuthCard } from "@/components/AuthCard";
import { Button, ErrorBox, Spinner, TextField } from "@/components/ui";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) return setError("Passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await signup(form.username.trim(), form.email.trim(), form.password);
      router.replace("/chat");
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <AuthCard title="Create your account" subtitle="Upload documents and ask Mnemo anything about them.">
      <form onSubmit={submit} className="space-y-4">
        <TextField label="Username" autoComplete="username" value={form.username} onChange={set("username")} required autoFocus />
        <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={set("email")} hint="Optional" />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          required
          minLength={8}
          hint="At least 8 characters, not too common or all numbers."
        />
        <TextField label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
        <ErrorBox>{error}</ErrorBox>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy && <Spinner />} Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
