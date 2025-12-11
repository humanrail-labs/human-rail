'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold">HumanRail</h1>
        <WalletMultiButton />
      </header>

      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">
          Human Identity and Confidential Payments on Solana
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          HumanRail provides a unified fabric for human identity verification
          and confidential payments. It enables AI companies and services to
          distribute human tasks (like RLHF preference labeling) through Solana
          Actions/Blinks, with payments processed confidentially using Token
          2022 extensions.
        </p>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Identity Registry</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Aggregate proof-of-personhood attestations from multiple providers
              into a unified human score.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Confidential Payments</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Pay invoices with privacy-preserving transfers using Token 2022
              confidential extensions.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-2">Human Tasks</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete micro-tasks distributed via Blinks and earn token rewards
              for your contributions.
            </p>
          </div>
        </div>
      </section>

      {connected ? (
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Get Started</h2>
          <div className="flex gap-4">
            <Link
              href="/demo"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
            >
              Open Developer Demo
            </Link>
            <Link
              href="/tasks"
              className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition"
            >
              View Available Tasks
            </Link>
          </div>
        </section>
      ) : (
        <section className="mb-12 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-center text-gray-600 dark:text-gray-300">
            Connect your wallet to access the developer demo and complete tasks.
          </p>
        </section>
      )}

      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4">Architecture Overview</h2>
        <pre className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm overflow-x-auto">
{`
+-------------------+     +-------------------+     +-------------------+
|  human_registry   |     |    human_pay      |     |   data_blink      |
|  (Identity PoP)   |<----|  (Confidential    |     |  (Human Tasks)    |
|                   |     |   Payments)       |     |                   |
+-------------------+     +-------------------+     +-------------------+
        ^                         ^                         ^
        |                         |                         |
        +-------------------------+-------------------------+
                                  |
                          +---------------+
                          |  TypeScript   |
                          |     SDK       |
                          +---------------+
                                  |
                    +-------------+-------------+
                    |                           |
            +---------------+           +---------------+
            | Actions Server|           |   Web Demo    |
            |   (Blinks)    |           |   (Next.js)   |
            +---------------+           +---------------+
`}
        </pre>
      </section>

      <footer className="text-center text-gray-500 text-sm pt-8 border-t">
        <p>HumanRail is open source software under the Apache 2.0 license.</p>
      </footer>
    </main>
  );
}
