import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-medium text-accent">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-accent hover:underline">
          Go to Menmo
        </Link>
      </div>
    </main>
  );
}
