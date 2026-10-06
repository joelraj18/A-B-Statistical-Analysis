'use client';

import { Cloud, CloudOff, LogOut, Mail } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { isCloudEnabled } from '@/lib/db/supabase';
import { sendMagicLink, signOut, useAuth } from '@/lib/store/auth';
import { toast } from '@/lib/store/toast';

/**
 * Optional cloud sync. The prototype stored plaintext passwords in
 * localStorage; v3 is local-first and uses Supabase magic links when enabled.
 */
export function AccountButton() {
  const user = useAuth((s) => s.user);
  const syncing = useAuth((s) => s.syncing);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);

  if (!isCloudEnabled) {
    return (
      <p className="flex items-center gap-2 text-[12px] text-faint" title="Configure Supabase to sync across devices">
        <CloudOff className="size-3.5" /> Saved in this browser
      </p>
    );
  }

  if (user) {
    return (
      <div className="flex items-center justify-between gap-2">
        <p className="flex min-w-0 items-center gap-2 text-[12px] text-muted">
          <Cloud className="size-3.5 shrink-0 text-accent" />
          <span className="truncate">{syncing ? 'Syncing…' : user.email}</span>
        </p>
        <button
          type="button"
          onClick={() => void signOut()}
          aria-label="Sign out"
          className="grid size-7 place-items-center rounded-full text-muted transition hover:bg-fill hover:text-fg"
        >
          <LogOut className="size-3.5" />
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await sendMagicLink(email.trim());
      setOpen(false);
      toast('Check your inbox', { description: `We sent a sign-in link to ${email.trim()}`, tone: 'positive' });
    } catch (err) {
      toast('Could not send link', { description: err instanceof Error ? err.message : undefined, tone: 'negative' });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="secondary" size="sm" icon={<Cloud />} onClick={() => setOpen(true)} className="w-full">
        Sync archive
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Sync your archive"
        description="Sign in with a one-time link to back up experiments and open them on any device, no password needed"
      >
        <form onSubmit={submit} className="space-y-4">
          <TextField label="Work email" value={email} onChange={setEmail} placeholder="analyst@company.com" />
          <Button type="submit" size="lg" icon={<Mail />} className="w-full" disabled={sending || !/^\S+@\S+\.\S+$/.test(email)}>
            {sending ? 'Sending…' : 'Email me a sign-in link'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
