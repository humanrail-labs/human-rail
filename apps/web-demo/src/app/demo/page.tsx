'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Link from 'next/link';

// Mock task data - in production, fetch from chain or Actions server
const MOCK_TASKS = [
  {
    pubkey: 'Task111111111111111111111111111111111111111',
    title: 'Image Preference Task',
    description: 'Which image better represents "a serene mountain landscape"?',
    rewardPerResponse: 0.001,
    humanRequirements: 1000,
    responseCount: 42,
  },
  {
    pubkey: 'Task222222222222222222222222222222222222222',
    title: 'Text Quality Task',
    description: 'Which response is more helpful and accurate?',
    rewardPerResponse: 0.002,
    humanRequirements: 2000,
    responseCount: 18,
  },
];

export default function DemoPage() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [humanScore, setHumanScore] = useState<number | null>(null);
  const [pendingRewards, setPendingRewards] = useState(0.005);

  useEffect(() => {
    if (publicKey) {
      connection.getBalance(publicKey).then((bal) => {
        setBalance(bal / LAMPORTS_PER_SOL);
      });
      // Mock human score - in production, fetch from registry
      setHumanScore(3500);
    }
  }, [publicKey, connection]);

  if (!connected) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <Link href="/" className="text-2xl font-bold">
            HumanRail
          </Link>
          <WalletMultiButton />
        </header>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Please connect your wallet to access the developer demo.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">
          HumanRail
        </Link>
        <WalletMultiButton />
      </header>

      <h1 className="text-2xl font-semibold mb-6">Developer Demo</h1>

      {/* Profile Section */}
      <section className="mb-8 p-6 border rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-500">Wallet</p>
            <p className="font-mono text-sm truncate">
              {publicKey?.toBase58()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">SOL Balance</p>
            <p className="font-semibold">
              {balance !== null ? balance.toFixed(4) : '...'} SOL
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Human Score</p>
            <p className="font-semibold">
              {humanScore !== null ? `${humanScore} / 10000` : 'Not registered'}
            </p>
          </div>
        </div>
        {humanScore === null && (
          <button className="mt-4 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
            Initialize Human Profile
          </button>
        )}
      </section>

      {/* Rewards Section */}
      <section className="mb-8 p-6 border rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold">Pending Rewards</h2>
            <p className="text-3xl font-bold text-purple-600">
              {pendingRewards.toFixed(4)} SOL
            </p>
          </div>
          <button
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50"
            disabled={pendingRewards === 0}
          >
            Claim All Rewards
          </button>
        </div>
      </section>

      {/* Tasks Section */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Available Tasks</h2>
        <div className="space-y-4">
          {MOCK_TASKS.map((task) => (
            <div key={task.pubkey} className="p-6 border rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{task.title}</h3>
                <span className="text-sm text-gray-500">
                  {task.responseCount} responses
                </span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {task.description}
              </p>
              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-gray-500">Reward: </span>
                  <span className="font-semibold">
                    {task.rewardPerResponse} SOL
                  </span>
                  <span className="text-gray-500 ml-4">Min Score: </span>
                  <span className="font-semibold">{task.humanRequirements}</span>
                </div>
                <Link
                  href={`/tasks/${task.pubkey}`}
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded hover:opacity-90 transition"
                >
                  Complete Task
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
