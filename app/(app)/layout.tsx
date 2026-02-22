import { RequireAuth } from '@/components/RequireAuth';
import { WalletProvider } from '@/components/WalletContext';
import { BottomMenu } from '@/components/ui/BottomMenu';
import ValentineCheck from '@/components/valentine/ValentineCheck';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <WalletProvider>
        <div className="min-h-screen max-w-md mx-auto bg-slate-950 text-slate-50 flex flex-col">
          <div className="flex-1 pb-20">
            {children}
          </div>
          <BottomMenu />
          <ValentineCheck />
        </div>
      </WalletProvider>
    </RequireAuth>
  );
}
