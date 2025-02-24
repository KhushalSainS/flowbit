'use client';

import { useState, useEffect } from 'react';
import EmailConfigForm from '@/components/EmailConfigForm';
import EmailConfigList from '@/components/EmailConfigList';
import { EmailConfig } from '@/types/email';

export default function Home() {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/email-config');
      const data = await response.json();
      setConfigs(data);
    } catch (error) {
      console.error('Failed to fetch email configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccess = () => {
    fetchConfigs();
  };

  const handleCheckInbox = async (configId: string) => {
    try {
      const response = await fetch('/api/fetch-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configId }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch emails');
      }

      alert(`Successfully processed ${data.processedEmails} emails with PDF attachments`);
    } catch (error) {
      console.error('Error checking inbox:', error);
      alert(error instanceof Error ? error.message : 'Failed to check inbox. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold">Email Configurations</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your email accounts for PDF ingestion from IMAP, Gmail, and Outlook
        </p>
      </div>

      <div className="grid gap-8">
        <div className="card p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Add New Configuration</h2>
          <EmailConfigForm onSuccess={handleSuccess} />
        </div>

        <div className="card p-6 bg-white dark:bg-gray-800 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Existing Configurations</h2>
          {isLoading ? (
            <p>Loading configurations...</p>
          ) : (
            <EmailConfigList 
              configs={configs} 
              onCheckInbox={handleCheckInbox}
              onConfigDelete={handleSuccess}
            />
          )}
        </div>
      </div>
    </div>
  );
}
