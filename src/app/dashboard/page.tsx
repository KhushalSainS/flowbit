'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PDFFile {
  id: string;
  fromAddress: string;
  subject: string;
  dateReceived: string;
  fileName: string;
}

export default function Dashboard() {
  const [pdfs, setPdfs] = useState<PDFFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPDFs();
  }, []);

  const fetchPDFs = async () => {
    try {
      const response = await fetch('/api/pdfs');
      const data = await response.json();
      setPdfs(data);
    } catch (error) {
      console.error('Error fetching PDFs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckNow = async () => {
    setLoading(true);
    try {
      await fetch('/api/email-ingestion/check', { method: 'POST' });
      await fetchPDFs();
    } catch (error) {
      console.error('Error checking emails:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">PDF Dashboard</h1>
        <div className="space-x-4">
          <Link href="/" className="button-secondary">
            Configure Emails
          </Link>
          <button 
            onClick={handleCheckNow} 
            disabled={loading}
            className="button-primary"
          >
            {loading ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                From
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Subject
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                File
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pdfs.map((pdf) => (
              <tr key={pdf.id}>
                <td className="px-6 py-4 whitespace-nowrap">{pdf.fromAddress}</td>
                <td className="px-6 py-4">{pdf.subject}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {new Date(pdf.dateReceived).toLocaleDateString()}
                </td>
                <td className="px-6 py-4">
                  <a 
                    href={`/api/pdfs/${pdf.id}/download`}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {pdf.fileName}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
