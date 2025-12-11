'use client';

import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

// Mock task metadata
const MOCK_TASK_METADATA = {
  title: 'Image Preference Task',
  description:
    'Help train AI models by selecting which option better matches the given prompt.',
  taskType: 'preference',
  prompt: 'Which image better represents "a serene mountain landscape at sunrise"?',
  options: [
    {
      id: 0,
      label: 'Option A',
      description: 'A photograph of mountains with soft morning light',
      imageUrl: '/placeholder-a.jpg',
    },
    {
      id: 1,
      label: 'Option B',
      description: 'A digital painting of peaks with dramatic colors',
      imageUrl: '/placeholder-b.jpg',
    },
  ],
  rewardPerResponse: 0.001,
  humanRequirements: 1000,
};

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { connected, publicKey } = useWallet();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const taskId = params.taskId as string;

  const handleSubmit = async () => {
    if (selectedOption === null || !publicKey) return;

    setIsSubmitting(true);

    try {
      // In production, this would:
      // 1. Build the submit_response transaction
      // 2. Send to wallet for signing
      // 3. Submit to the network
      console.log('Submitting response:', {
        task: taskId,
        choice: selectedOption,
        worker: publicKey.toBase58(),
      });

      // Simulate transaction
      await new Promise((resolve) => setTimeout(resolve, 1500));

      setSubmitted(true);
    } catch (error) {
      console.error('Error submitting response:', error);
      alert('Failed to submit response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            HumanRail
          </Link>
          <WalletMultiButton />
        </header>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Please connect your wallet to complete this task.
          </p>
        </div>
      </main>
    );
  }

  if (submitted) {
    return (
      <main className="min-h-screen p-8 max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <Link href="/" className="text-2xl font-bold">
            HumanRail
          </Link>
          <WalletMultiButton />
        </header>
        <div className="text-center py-12">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Response Submitted</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Your response has been recorded. Reward:{' '}
              {MOCK_TASK_METADATA.rewardPerResponse} SOL
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Link
              href="/tasks"
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Find More Tasks
            </Link>
            <Link
              href="/demo"
              className="px-6 py-3 border border-purple-600 text-purple-600 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20"
            >
              View Rewards
            </Link>
          </div>
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

      <div className="mb-6">
        <Link
          href="/tasks"
          className="text-purple-600 hover:underline flex items-center gap-1"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Tasks
        </Link>
      </div>

      <div className="border rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-semibold mb-2">
          {MOCK_TASK_METADATA.title}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          {MOCK_TASK_METADATA.description}
        </p>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-500">Reward</span>
            <p className="font-semibold">
              {MOCK_TASK_METADATA.rewardPerResponse} SOL
            </p>
          </div>
          <div>
            <span className="text-gray-500">Min Human Score</span>
            <p className="font-semibold">
              {MOCK_TASK_METADATA.humanRequirements}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">{MOCK_TASK_METADATA.prompt}</h2>

        <div className="grid md:grid-cols-2 gap-6">
          {MOCK_TASK_METADATA.options.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedOption(option.id)}
              className={`p-6 border-2 rounded-lg text-left transition ${
                selectedOption === option.id
                  ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
              }`}
            >
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded mb-4 flex items-center justify-center">
                <span className="text-4xl text-gray-400">
                  {option.label === 'Option A' ? 'A' : 'B'}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{option.label}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {option.description}
              </p>
              {selectedOption === option.id && (
                <div className="mt-3 flex items-center gap-2 text-purple-600">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">Selected</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={selectedOption === null || isSubmitting}
          className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </>
          ) : (
            'Submit Response'
          )}
        </button>
      </div>
    </main>
  );
}
