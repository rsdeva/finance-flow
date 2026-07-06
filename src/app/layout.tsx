import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase';
import { Inter } from 'next/font/google';
import { TransactionsProvider } from '@/hooks/use-transactions-provider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { CategoriesProvider } from '@/hooks/use-categories-provider';
import { PaymentMethodsProvider } from '@/hooks/use-payment-methods-provider';
import { InvestmentCategoriesProvider } from '@/hooks/use-investment-categories-provider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'FinanceFlow',
  description: 'A simple app to track your daily income and expenses.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body className={`${inter.variable} font-body antialiased h-full bg-background`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <FirebaseClientProvider>
            <CategoriesProvider>
              <PaymentMethodsProvider>
                <InvestmentCategoriesProvider>
                  <TransactionsProvider>{children}</TransactionsProvider>
                </InvestmentCategoriesProvider>
              </PaymentMethodsProvider>
            </CategoriesProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
