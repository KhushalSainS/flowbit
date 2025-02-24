'use client';

import { useState, useEffect } from 'react';
import type { EmailConfig, ConnectionType } from '@/types/email';

interface Props {
  onSuccess?: () => void;
}

export default function EmailConfigForm({ onSuccess }: Props) {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<EmailConfig>>({
    connectionType: 'IMAP',
    useSSL: true
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/email-ingestion/configs');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const text = await response.text();
      if (!text) {
        setConfigs([]);
        return;
      }
      const data = JSON.parse(text);
      setConfigs(data);
    } catch (error) {
      console.error('Error fetching configs:', error);
      setConfigs([]);
      // You might want to add error state handling here
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = isEditing 
        ? `/api/email-ingestion/configs/${isEditing}`
        : '/api/email-ingestion/configs';

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        console.error('Failed to parse response:', e);
      }

      if (!response.ok) {
        throw new Error(responseData?.message || 'Failed to save config');
      }

      setFormData({
        connectionType: 'IMAP',
        useSSL: true
      });
      setIsEditing(null);
      await fetchConfigs();
      onSuccess?.();
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Failed to save email configuration');
    }
  };

  const handleEdit = (config: EmailConfig) => {
    if (config.id) {
      setIsEditing(config.id);
      setFormData(config);
    }
  };

  const handleDelete = async (id: string | undefined) => {
    if (!id) return;
    if (!confirm('Are you sure you want to delete this configuration?')) return;

    try {
      await fetch(`/api/email-ingestion/configs/${id}`, {
        method: 'DELETE',
      });
      await fetchConfigs();
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to delete configuration');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            type="email"
            required
            className="input"
            value={formData.emailAddress || ''}
            onChange={e => setFormData(prev => ({ ...prev, emailAddress: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Connection Type</label>
          <select
            required
            className="input"
            value={formData.connectionType}
            onChange={e => setFormData(prev => ({ ...prev, connectionType: e.target.value as ConnectionType }))}
          >
            <option value="IMAP">IMAP</option>
            <option value="GMAIL">Gmail API</option>
            <option value="OUTLOOK">Outlook API</option>
          </select>
        </div>
        {formData.connectionType === 'IMAP' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input
                type="text"
                className="input"
                value={formData.username || ''}
                onChange={e => setFormData(prev => ({ ...prev, username: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <input
                type="password"
                className="input"
                value={formData.password || ''}
                onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Host</label>
              <input
                type="text"
                className="input"
                value={formData.host || ''}
                onChange={e => setFormData(prev => ({ ...prev, host: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Port</label>
              <input
                type="number"
                className="input"
                value={formData.port || ''}
                onChange={e => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || undefined }))}
              />
            </div>
          </>
        )}
        {(formData.connectionType === 'GMAIL' || formData.connectionType === 'OUTLOOK') && (
          <div>
            <label className="block text-sm font-medium mb-1">Access Token</label>
            <input
              type="password"
              className="input"
              value={formData.password || ''}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
            />
          </div>
        )}
        <button type="submit" className="button-primary">
          {isEditing ? 'Update' : 'Add'} Configuration
        </button>
      </form>
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Configured Accounts</h2>
        <div className="space-y-4">
          {configs.map(config => (
            <div key={config.id} className="card p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{config.emailAddress}</h3>
                  <p className="text-sm text-gray-500">{config.connectionType}</p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleEdit(config)}
                    className="button-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => config.id && handleDelete(config.id)}
                    className="button-secondary text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}