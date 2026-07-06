import { AuthForm } from '@/components/auth/AuthForm';

export default function LoginPage() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <AuthForm />
      </div>
    </div>
  );
}
