import { RequireAuth } from '@/components/RequireAuth';
import { WalletProvider } from '@/components/WalletContext';
import { BottomMenu } from '@/components/ui/BottomMenu';
import ValentineCheck from '@/components/valentine/ValentineCheck';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WalletProvider>
        <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-slate-950 text-slate-50">
          <div className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))]">
            {children}
          </div>
          <BottomMenu />
          <ValentineCheck />
        </div>
      </WalletProvider>
    </RequireAuth>
  );
}
