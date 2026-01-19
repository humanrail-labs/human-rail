"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">
      <div className="text-center">
        <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
        <p className="text-neutral-400 mb-4">{error.message}</p>
        <button
          onClick={() => reset()}
          className="px-4 py-2 bg-cyan-600 rounded hover:bg-cyan-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
