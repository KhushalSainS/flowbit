'use client';

import EmailConfigForm from '@/components/EmailConfigForm';

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Email Configuration</h1>
      <EmailConfigForm onSuccess={() => window.location.reload()} />
    </main>
  );
}
