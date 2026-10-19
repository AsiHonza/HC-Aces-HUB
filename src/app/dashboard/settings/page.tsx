'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { ProfileSettingsCard } from '@/features/roster';
import { NotificationSettingsCard } from '@/features/notifications';
import { AdminStatsSettingsCard, LeagueSyncCard } from '@/features/stats';
import { ThemeSettingsCard } from '@/components/theme-settings-card';
import type { UserProfile } from '@/types';

function SettingsPageContent() {
  const { user, firestore } = useFirebase();
  const userDocRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'users', user.uid) : null),
    [firestore, user]
  );
  const { data: userProfile, isLoading } = useDoc<UserProfile>(userDocRef);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-12 w-12 text-primary" />
      </div>
    );
  }

  return (
    <div className="py-8 space-y-8">
      <ThemeSettingsCard />
      <ProfileSettingsCard userProfile={userProfile ?? null} />
      <NotificationSettingsCard />
      {userProfile?.role === 'admin' && (
        <>
          <LeagueSyncCard />
          <AdminStatsSettingsCard />
        </>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="container py-8">Načítání...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
