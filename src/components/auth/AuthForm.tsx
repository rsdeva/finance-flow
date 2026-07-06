'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/firebase';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

const AuthFormSchema = z.object({
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.').optional(),
});

type AuthFormValues = z.infer<typeof AuthFormSchema>;

type AuthMode = 'signin' | 'signup' | 'reset_password';

export function AuthForm() {
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [isPending, startTransition] = useTransition();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(AuthFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: AuthFormValues) => {
    startTransition(async () => {
      try {
        if (authMode === 'reset_password') {
          await sendPasswordResetEmail(auth, values.email);
          toast({ title: 'Password Reset Email Sent', description: 'Check your inbox for a link to reset your password.' });
          setAuthMode('signin');
          return;
        }

        if (!values.password) {
            form.setError('password', { type: 'manual', message: 'Password is required.' });
            return;
        }

        const userCredential = authMode === 'signup'
          ? await createUserWithEmailAndPassword(auth, values.email, values.password)
          : await signInWithEmailAndPassword(auth, values.email, values.password);
        
        const idToken = await userCredential.user.getIdToken();

        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });

        toast({ title: authMode === 'signup' ? 'Account created!' : 'Signed in successfully!' });
        router.push('/');

      } catch (error: any) {
        let description = 'An unexpected error occurred.';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            description = 'Invalid email or password. Please check your credentials and try again.';
        } else if (error.code === 'auth/email-already-in-use') {
            description = 'This email is already in use. Please sign in or use a different email.';
        } else if (error.message) {
            description = error.message;
        }

        toast({
          variant: 'destructive',
          title: 'Authentication Failed',
          description: description,
        });
      }
    });
  };

  const getTitle = () => {
    switch (authMode) {
      case 'signin': return 'Welcome Back!';
      case 'signup': return 'Create an Account';
      case 'reset_password': return 'Reset Your Password';
    }
  }

  const getDescription = () => {
    switch (authMode) {
      case 'signin': return 'Sign in to continue to FinanceFlow.';
      case 'signup': return 'Enter your details to get started.';
      case 'reset_password': return 'Enter your email to receive a password reset link.';
    }
  }

  const getButtonText = () => {
    switch (authMode) {
        case 'signin': return 'Sign In';
        case 'signup': return 'Sign Up';
        case 'reset_password': return 'Send Reset Link';
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">{getTitle()}</CardTitle>
        <CardDescription>{getDescription()}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {authMode !== 'reset_password' && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {authMode === 'signin' && (
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="link"
                        className="p-0 h-auto text-sm"
                        onClick={() => setAuthMode('reset_password')}
                    >
                        Forgot Password?
                    </Button>
                </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getButtonText()}
            </Button>
          </form>
        </Form>
        <div className="mt-4 text-center text-sm">
          {authMode === 'signin' && "Don't have an account? "}
          {authMode === 'signup' && 'Already have an account? '}
          {authMode === 'reset_password' && 'Remember your password? '}

          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => {
                setAuthMode(authMode === 'signup' ? 'signin' : 'signup');
                if (authMode === 'reset_password') setAuthMode('signin');
                form.reset();
            }}
          >
            {authMode === 'signup' || authMode === 'reset_password' ? 'Sign In' : 'Sign Up'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
