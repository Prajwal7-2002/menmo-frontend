"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/toast";
import { Button, ErrorBox, Spinner, TextField } from "@/components/ui";

export default function SettingsPage() {
  const { username } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) return setError("New passwords don't match.");
    setBusy(true);
    setError("");
    try {
      await api.changePassword(form.current, form.next);
      setForm({ current: "", next: "", confirm: "" });
      toast("Password updated");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted">
        Signed in as <span className="font-medium text-fg">{username}</span>
      </p>

      <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
        <h2 className="font-semibold">Change password</h2>
        <form onSubmit={submit} className="mt-4 space-y-4">
          <TextField label="Current password" type="password" autoComplete="current-password" value={form.current} onChange={set("current")} required />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={set("next")}
            required
            minLength={8}
            hint="At least 8 characters, not too common or all numbers."
          />
          <TextField label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} required />
          <ErrorBox>{error}</ErrorBox>
          <Button type="submit" disabled={busy}>
            {busy && <Spinner />} Update password
          </Button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface p-6 text-sm">
        <h2 className="font-semibold">Tips</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-muted">
          <li>
            Start a message with <span className="font-medium text-fg">&ldquo;Remember that…&rdquo;</span> and Mnemo will keep it in
            mind across chats.
          </li>
          <li>Pick a document in the chat box to keep answers strictly inside that file.</li>
          <li>Tone is chosen automatically from how you write; pick one in the chat box to force it.</li>
        </ul>
      </section>
    </div>
  );
}
