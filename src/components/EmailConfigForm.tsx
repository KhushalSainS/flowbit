'use client';

import { useState } from 'react';
import type { EmailConfig, ConnectionType } from '@/types/email';

interface Props {
  onSuccess?: () => void;
}

export default function EmailConfigForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState<Partial<EmailConfig>>({
    emailAddress: '',
    connectionType: 'IMAP',
    username: '',
    password: '',
    host: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/email-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save configuration');
      }

      setFormData({
        emailAddress: '',
        connectionType: 'IMAP',
        username: '',
        password: '',
        host: ''
      });
      
      onSuccess?.();
    } catch (error) {
      console.error('Error saving config:', error);
      alert(error instanceof Error ? error.message : 'Failed to save configuration');
    }
  };

  const handleGmailAuth = async () => {
    try {
      if (!formData.emailAddress) {
        alert('Please enter your email address first');
        return;
      }

      const response = await fetch(`/api/auth/gmail?email=${encodeURIComponent(formData.emailAddress)}`);
      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start Gmail auth:', error);
      alert('Failed to authenticate with Gmail');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" id="email-config-form">
      <div>
        <label htmlFor="emailAddress" className="block mb-2">Email Address</label>
        <input
          id="emailAddress"
          type="email"
          value={formData.emailAddress}
          onChange={(e) => setFormData({ ...formData, emailAddress: e.target.value })}
          className="input"
          required
        />
      </div>

      <div>
        <label htmlFor="connectionType" className="block mb-2">Connection Type</label>
        <select
          id="connectionType"
          value={formData.connectionType}
          onChange={(e) => setFormData({ ...formData, connectionType: e.target.value as ConnectionType })}
          className="input"
          required
        >
          <option value="IMAP">IMAP</option>
          <option value="GMAIL">Gmail API</option>
          <option value="OUTLOOK">Outlook/Graph API</option>
        </select>
      </div>

      <div>
        <label htmlFor="username" className="block mb-2">Username</label>
        <input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          className="input"
          required
        />
      </div>

      <div>
        <label htmlFor="password" className="block mb-2">Password/Token</label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="input"
          required
        />
      </div>

      {formData.connectionType === 'IMAP' && (
        <div>
          <label htmlFor="host" className="block mb-2">Host</label>
          <input
            id="host"
            type="text"
            value={formData.host}
            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
            className="input"
            placeholder="e.g., imap.gmail.com"
            required
          />
        </div>
      )}

      {formData.connectionType === 'GMAIL' && (
        <div>
          <button
            type="button"
            onClick={handleGmailAuth}
            className="button-secondary w-full"
          >
            Authenticate with Gmail
          </button>
        </div>
      )}

      <button
        type="submit"
        className="button-primary w-full"
      >
        Save Configuration
      </button>
    </form>
  );
}