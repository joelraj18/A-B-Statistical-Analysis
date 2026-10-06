import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-[13px] font-semibold text-accent">404</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page didn’t reach significance.</h1>
      <p className="mt-3 text-muted">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white">
        Back to overview
      </Link>
    </div>
  );
}
