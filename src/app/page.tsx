'use client';

import { AuthProvider } from '@/components/auth/AuthProvider';
import { AppWrapper } from '@/components/AppWrapper';

export default function Home() {
  return (
    <AuthProvider>
      <AppWrapper />
    </AuthProvider>
  );
}
