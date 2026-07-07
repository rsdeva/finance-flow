'use client';

import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoansDashboard } from '@/components/loans/LoansDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoansPage() {
  const auth = useAuth();
  const router = useRouter();
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (!user) {
        router.push('/login');
      } else {
        setIsAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth, router]);

  if (isAuthLoading) {
    return (
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <main className="flex h-full flex-col">
      <div className="flex-1 space-y-6 p-4 md:p-8">
        <div className="mb-4">
          <Button variant="ghost" asChild className="pl-0 text-muted-foreground hover:text-foreground">
             <Link href="/">
               <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
             </Link>
          </Button>
        </div>
        <LoansDashboard />
      </div>
    </main>
  );
}
