// app/(app)/layout.tsx
import { RequireAuth } from '@/components/RequireAuth';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen max-w-md mx-auto bg-slate-950 text-slate-50">
        {children}
      </div>
    </RequireAuth>
  );
}
