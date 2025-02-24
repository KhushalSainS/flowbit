'use client';

import { useState } from 'react';

type EmailConfig = {
  id: string;
  emailAddress: string;
  connectionType: string;
  host?: string;
  active: boolean;
};

type Props = {
  configs: EmailConfig[];
  onUpdate: () => void;
};

export function EmailConfigList({ configs, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/email-ingestion/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete configuration');
      onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete configuration');
    } finally {
      setLoading(false);
    }
  };

  if (configs.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No configurations added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {configs.map(config => (
        <div
          key={config.id}
          className="card p-4 flex justify-between items-center hover:border-blue-200 transition-colors"
        >
          <div className="space-y-1">
            <h3 className="font-medium">{config.emailAddress}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {config.connectionType} {config.host ? `- ${config.host}` : ''}
            </p>
            <span 
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs
                ${config.active 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                }`}
            >
              {config.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <button
            onClick={() => handleDelete(config.id)}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-red-600 disabled:opacity-50"
          >
            <span className="sr-only">Delete</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
