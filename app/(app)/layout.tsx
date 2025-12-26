// app/(app)/layout.tsx
import { RequireAuth } from '@/components/RequireAuth';
import { WalletProvider } from '@/components/WalletContext';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WalletProvider>
        <div className="min-h-screen max-w-md mx-auto bg-slate-950 text-slate-50">
          {children}
        </div>
      </WalletProvider>
    </RequireAuth>
  );
}
