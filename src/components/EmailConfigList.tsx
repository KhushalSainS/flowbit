'use client';

import { EmailConfig } from '@/types/email';

interface EmailConfigListProps {
  configs: EmailConfig[];
  onCheckInbox: (configId: string) => void;
  onConfigDelete: () => void;
}

export default function EmailConfigList({ 
  configs, 
  onCheckInbox, 
  onConfigDelete 
}: EmailConfigListProps) {
  const handleDelete = async (configId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) {
      return;
    }

    try {
      const response = await fetch(`/api/email-config?id=${configId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete configuration');
      }

      onConfigDelete();
    } catch (error) {
      console.error('Error deleting configuration:', error);
      alert('Failed to delete configuration. Please try again.');
    }
  };

  if (configs.length === 0) {
    return <p>No email configurations found.</p>;
  }

  return (
    <div className="space-y-4">
      {configs.map((config) => (
        <div 
          key={config.id} 
          className="border p-4 rounded-lg flex items-center justify-between"
        >
          <div>
            <h3 className="font-semibold">{config.emailAddress}</h3>
            <p className="text-sm text-gray-600">
              {config.connectionType} - {config.username}
            </p>
          </div>
          <div className="space-x-2">
            <button
              onClick={() => onCheckInbox(config.id)}
              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            >
              Check Inbox
            </button>
            <button
              onClick={() => handleDelete(config.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
