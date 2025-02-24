import { useState } from 'react';

interface DashboardHeaderProps {
  onCheckEmails: () => Promise<void>;
  isLoading: boolean;
}

export default function DashboardHeader({ onCheckEmails, isLoading }: DashboardHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Email Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor and manage your email ingestion
        </p>
      </div>
      <div className="flex gap-4">
        <button 
          onClick={onCheckEmails}
          disabled={isLoading}
          className="button-primary flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="animate-spin">⚡</span>
              Checking...
            </>
          ) : (
            <>
              <span>📥</span>
              Check New Emails
            </>
          )}
        </button>
      </div>
    </div>
  );
} 