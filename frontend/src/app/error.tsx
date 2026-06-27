'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm text-center">
        <h2 className="mb-2 text-xl font-bold text-gray-900">Something went wrong</h2>
        <p className="mb-6 text-sm text-gray-500">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <button
          onClick={() => reset()}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-500"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
