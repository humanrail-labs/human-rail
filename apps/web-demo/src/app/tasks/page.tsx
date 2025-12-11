'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

// Mock task data
const MOCK_TASKS = [
  {
    pubkey: 'Task111111111111111111111111111111111111111',
    title: 'Image Preference Task',
    description: 'Which image better represents "a serene mountain landscape"?',
    rewardPerResponse: 0.001,
    humanRequirements: 1000,
    responseCount: 42,
    isOpen: true,
  },
  {
    pubkey: 'Task222222222222222222222222222222222222222',
    title: 'Text Quality Task',
    description: 'Which response is more helpful and accurate?',
    rewardPerResponse: 0.002,
    humanRequirements: 2000,
    responseCount: 18,
    isOpen: true,
  },
  {
    pubkey: 'Task333333333333333333333333333333333333333',
    title: 'Safety Classification',
    description: 'Is this content safe for general audiences?',
    rewardPerResponse: 0.0015,
    humanRequirements: 3000,
    responseCount: 156,
    isOpen: true,
  },
];

export default function TasksPage() {
  const { connected } = useWallet();
  const [filter, setFilter] = useState<'all' | 'eligible'>('all');

  const filteredTasks = MOCK_TASKS.filter((task) => {
    if (filter === 'eligible') {
      // In production, check against user's human score
      return task.humanRequirements <= 3500;
    }
    return true;
  });

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <Link href="/" className="text-2xl font-bold">
          HumanRail
        </Link>
        <WalletMultiButton />
      </header>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Available Tasks</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            All Tasks
          </button>
          <button
            onClick={() => setFilter('eligible')}
            className={`px-4 py-2 rounded ${
              filter === 'eligible'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800'
            }`}
          >
            Eligible Only
          </button>
        </div>
      </div>

      {!connected && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-yellow-800 dark:text-yellow-200">
            Connect your wallet to complete tasks and earn rewards.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div
            key={task.pubkey}
            className="p-6 border rounded-lg hover:border-purple-300 transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{task.title}</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {task.pubkey.slice(0, 8)}...{task.pubkey.slice(-8)}
                </p>
              </div>
              <span
                className={`px-2 py-1 text-xs rounded ${
                  task.isOpen
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {task.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {task.description}
            </p>
            <div className="flex justify-between items-center">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="text-gray-500">Reward</span>
                  <p className="font-semibold">{task.rewardPerResponse} SOL</p>
                </div>
                <div>
                  <span className="text-gray-500">Min Score</span>
                  <p className="font-semibold">{task.humanRequirements}</p>
                </div>
                <div>
                  <span className="text-gray-500">Responses</span>
                  <p className="font-semibold">{task.responseCount}</p>
                </div>
              </div>
              {connected && task.isOpen ? (
                <Link
                  href={`/tasks/${task.pubkey}`}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                >
                  Complete Task
                </Link>
              ) : (
                <button
                  disabled
                  className="px-4 py-2 bg-gray-200 text-gray-500 rounded cursor-not-allowed"
                >
                  {connected ? 'Closed' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No tasks available matching your criteria.
        </div>
      )}
    </main>
  );
}
