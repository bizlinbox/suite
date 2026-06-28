'use client';

import { Store, Sparkles, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function MarketplacePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Marketplace</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Discover integrations and extensions for your workspace
        </p>
      </div>

      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900/20">
          <Store size={40} className="text-blue-600 dark:text-blue-400" />
        </div>

        <h2 className="mb-2 text-xl font-semibold text-gray-900 dark:text-gray-100">
          Coming Soon
        </h2>
        <p className="mb-8 max-w-md text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          We are building a curated marketplace of integrations, tools, and extensions to help you extend BizlInbox. Stay tuned for updates.
        </p>

        <div className="flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
          <Sparkles size={16} />
          <span>Something awesome is in the works</span>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
