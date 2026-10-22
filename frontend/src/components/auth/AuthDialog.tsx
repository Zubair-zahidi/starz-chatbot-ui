import React, { useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { X, Lock, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/authState';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

type Mode = 'login' | 'register';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: Mode;
}

const AuthDialog: React.FC<AuthDialogProps> = ({ open, onOpenChange, defaultMode = 'login' }) => {
  const { login, register } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<Mode>(defaultMode);

  // Keep mode stable when opening.
  React.useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  const title = useMemo(() => (mode === 'login' ? 'Sign In' : 'Create Account'), [mode]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" />
        <Dialog.Content
          className="fixed z-[61] left-1/2 top-1/2 w-[min(920px,calc(100vw-2rem))]
                     -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-stellar-blue/20
                     bg-cosmic-black/80 shadow-2xl overflow-hidden"
        >
          {/* Ambient gradients like your HTML mock */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-stellar-blue/20 blur-[80px]" />
            <div className="absolute -bottom-48 -right-48 w-[560px] h-[560px] rounded-full bg-stellar-purple/20 blur-[90px]" />
            <div className="absolute inset-0 quantum-grid opacity-30" />
          </div>

          <div className="relative p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="font-orbitron text-2xl md:text-3xl font-bold text-gradient">
                  {title}
                </Dialog.Title>
                <Dialog.Description className="text-stellar-silver mt-2 max-w-2xl">
                  Access saved sessions, advanced analysis modes, and your enterprise workspace.
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="p-2 rounded-xl hover:bg-cosmic-matter transition-colors"
                aria-label="Close"
                disabled={busy}
              >
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Auth card */}
              <div className="quantum-card p-6">
                <Tabs.Root value={mode} onValueChange={(v) => setMode(v as Mode)}>
                  <Tabs.List className="grid grid-cols-2 gap-2 p-2 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
                    <Tabs.Trigger
                      value="login"
                      className="px-4 py-2 rounded-xl text-sm font-semibold data-[state=active]:bg-stellar-blue/20 data-[state=active]:text-white text-stellar-silver"
                    >
                      Sign In
                    </Tabs.Trigger>
                    <Tabs.Trigger
                      value="register"
                      className="px-4 py-2 rounded-xl text-sm font-semibold data-[state=active]:bg-stellar-purple/20 data-[state=active]:text-white text-stellar-silver"
                    >
                      Create
                    </Tabs.Trigger>
                  </Tabs.List>

                  <div className="mt-5">
                    <Tabs.Content value="login">
                      <LoginForm
                        disabled={busy}
                        onSubmit={async (email, password) => {
                          setBusy(true);
                          try {
                            await login(email, password);
                            onOpenChange(false);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </Tabs.Content>
                    <Tabs.Content value="register">
                      <RegisterForm
                        disabled={busy}
                        onSubmit={async (payload) => {
                          setBusy(true);
                          try {
                            await register(payload);
                            onOpenChange(false);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </Tabs.Content>
                  </div>
                </Tabs.Root>
              </div>

              {/* Right: Cards panel (professional marketing/benefits) */}
              <div className="space-y-4">
                <div className="quantum-card p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-stellar-blue to-stellar-teal flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-orbitron font-semibold">Enterprise Sessions</p>
                      <p className="text-sm text-stellar-silver">Save, export, and revisit your analyses.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="p-4 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
                      <p className="text-xs text-stellar-silver">Memory</p>
                      <p className="font-orbitron text-lg text-stellar-teal">ON</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
                      <p className="text-xs text-stellar-silver">Exports</p>
                      <p className="font-orbitron text-lg text-stellar-teal">TXT/CSV</p>
                    </div>
                  </div>
                </div>

                <div className="quantum-card p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-stellar-purple to-stellar-pink flex items-center justify-center">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-orbitron font-semibold">Guest Mode Limit</p>
                      <p className="text-sm text-stellar-silver">
                        After 4 messages, sign in to continue the mission.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AuthDialog;
