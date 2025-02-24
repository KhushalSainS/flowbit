'use client';

import { useState, useEffect } from 'react';
import DashboardHeader from '@/components/DashboardHeader';

interface EmailMetadata {
  id: string;
  fromAddress: string;
  subject: string;
  dateReceived: string;
  attachmentFileName: string;
  configId: string;
  config: {
    emailAddress: string;
    connectionType: string;
  };
}

export default function Dashboard() {
  const [emails, setEmails] = useState<EmailMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmails();
  }, []);

  const fetchEmails = async () => {
    try {
      const response = await fetch('/api/email-metadata');
      if (!response.ok) throw new Error('Failed to fetch emails');
      const data = await response.json();
      setEmails(data);
      setError(null);
    } catch (error) {
      setError('Failed to load emails');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/fetch-emails', { method: 'POST' });
      const data = await response.json();

      if (response.status === 429) {
        setError('Email fetch already in progress. Please wait...');
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check emails');
      }

      await fetchEmails();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to check emails');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader onCheckEmails={handleCheckEmails} isLoading={loading} />
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left p-4 font-medium">From</th>
                <th className="text-left p-4 font-medium">Subject</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Account</th>
                <th className="text-left p-4 font-medium">Attachment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center">
                    Loading...
                  </td>
                </tr>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">
                    No emails found. Click "Check New Emails" to fetch new messages.
                  </td>
                </tr>
              ) : (
                emails.map((email) => (
                  <tr key={email.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4 whitespace-nowrap">{email.fromAddress}</td>
                    <td className="p-4">{email.subject}</td>
                    <td className="p-4 whitespace-nowrap">
                      {new Date(email.dateReceived).toLocaleDateString()}
                    </td>
                    <td className="p-4 whitespace-nowrap">
                      {email.config.emailAddress}
                      <span className="ml-2 text-xs text-gray-500">
                        ({email.config.connectionType})
                      </span>
                    </td>
                    <td className="p-4">
                      <a 
                        href={`/pdfs/${email.attachmentFileName}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {email.attachmentFileName}
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
