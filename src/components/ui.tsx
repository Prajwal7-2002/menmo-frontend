import { useId } from "react";
import { LoaderCircle } from "lucide-react";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2 font-semibold tracking-tight text-fg">
      <span
        aria-hidden
        className="grid place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-white"
        style={{ width: size, height: size, fontSize: size * 0.55 }}
      >
        M
      </span>
      Mnemo
    </span>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return <LoaderCircle className={`animate-spin ${className}`} aria-label="Loading" />;
}

export function FullPageSpinner() {
  return (
    <div className="grid h-full min-h-screen place-items-center text-muted">
      <Spinner className="size-6" />
    </div>
  );
}

const buttonStyles = {
  primary:
    "bg-gradient-to-r from-accent to-accent-2 text-white shadow-sm hover:opacity-95 disabled:opacity-50",
  secondary: "border border-border bg-surface text-fg hover:bg-surface-2 disabled:opacity-50",
  ghost: "text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-50",
  danger: "text-danger hover:bg-danger/10 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonStyles }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${buttonStyles[variant]} ${className}`}
    />
  );
}

export function TextField({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="text-sm">
      <label htmlFor={id} className="mb-1.5 block font-medium text-fg">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-fg outline-none transition placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
      />
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ErrorBox({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
      {children}
    </div>
  );
}
