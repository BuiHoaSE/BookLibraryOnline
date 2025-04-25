"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    // Translate error codes to readable messages
    switch (error) {
      case 'session_exchange':
        setErrorMessage('Failed to exchange the authentication code for a session.');
        break;
      case 'session_verification':
        setErrorMessage('Could not verify your authentication session.');
        break;
      case 'no_code':
        setErrorMessage('No authentication code was provided.');
        break;
      case 'unexpected':
        setErrorMessage('An unexpected error occurred during authentication.');
        break;
      default:
        setErrorMessage(`Authentication error: ${error || 'Unknown error'}`);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Authentication Error</h1>
          <p className="mt-2 text-lg text-red-600">{errorMessage}</p>
          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Please try again or contact support if the problem persists.
            </p>
          </div>
          <div className="mt-6">
            <Link href="/" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 