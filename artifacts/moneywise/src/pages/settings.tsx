import { useState, type FormEvent } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Check, ChevronRight, LogOut, Moon, ShieldCheck, Sun, UserRound } from 'lucide-react';
import { WorkspaceShell } from '@/components/moneywise-shell';
import { initials } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const [dark, setDark] = useState(() => localStorage.getItem('moneywise-theme') === 'dark');
  const [saved, setSaved] = useState(false);
  if (!isLoaded || !user) return <WorkspaceShell><div className="animate-pulse space-y-4"><div className="h-12 w-64 rounded bg-muted" /><div className="h-60 rounded-[1.4rem] bg-muted" /></div></WorkspaceShell>;
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('moneywise-theme', next ? 'dark' : 'light');
    toast({ title: `${next ? 'Night' : 'Day'} mode on`, description: 'Your preference is saved on this device.' });
  };
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const firstName = String(form.get('firstName') || '').trim();
    const lastName = String(form.get('lastName') || '').trim();
    await user.update({ firstName, lastName });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
    toast({ title: 'Profile saved', description: 'Your name is looking good.' });
  };
  return <WorkspaceShell><div className="animate-rise-in"><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your space</p><h1 className="display-font mt-2 text-5xl font-semibold tracking-[-.06em]">Settings</h1><p className="mt-3 text-sm text-muted-foreground">A few details to make Moneywise feel like yours.</p></div><div className="mt-9 grid gap-5 lg:grid-cols-[1.15fr_.85fr]"><section className="rounded-[1.4rem] border border-border bg-card p-6 md:p-8"><div className="flex items-center gap-4 border-b border-border pb-6"><div className="grid h-14 w-14 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-lg font-bold text-[hsl(var(--accent-foreground))]" data-testid="avatar-settings">{initials(user.fullName || user.firstName)}</div><div><h2 className="display-font text-2xl font-semibold">Personal details</h2><p className="text-sm text-muted-foreground">This is how we’ll greet you.</p></div></div><form onSubmit={saveProfile} className="mt-7 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label><span className="field-label">First name</span><input name="firstName" defaultValue={user.firstName || ''} className="field-input" data-testid="input-first-name" /></label><label><span className="field-label">Last name</span><input name="lastName" defaultValue={user.lastName || ''} className="field-input" data-testid="input-last-name" /></label></div><label className="block"><span className="field-label">Email address</span><input value={user.primaryEmailAddress?.emailAddress || ''} readOnly className="field-input cursor-not-allowed opacity-65" data-testid="input-email-address" /></label><button type="submit" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-save-profile">{saved ? <><Check className="h-4 w-4" /> Saved</> : 'Save profile'}</button></form></section><div className="space-y-5"><section className="rounded-[1.4rem] border border-border bg-card p-6 md:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Preferences</p><h2 className="display-font mt-2 text-2xl font-semibold">Set the tone</h2><button onClick={toggleTheme} className="mt-6 flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted" data-testid="button-toggle-theme"><span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-secondary-foreground">{dark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</span><span className="flex-1"><span className="block text-sm font-bold">{dark ? 'Night mode' : 'Day mode'}</span><span className="text-xs text-muted-foreground">Use {dark ? 'a lighter' : 'a softer'} palette</span></span><span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${dark ? 'bg-primary' : 'bg-muted'}`}><span className={`block h-4 w-4 rounded-full bg-card transition-transform ${dark ? 'translate-x-4' : ''}`} /></span></button></section><section className="rounded-[1.4rem] border border-border bg-card p-6 md:p-8"><p className="text-xs font-bold uppercase tracking-[.16em] text-muted-foreground">Account</p><div className="mt-4 divide-y divide-border"><div className="flex items-center gap-3 py-3"><ShieldCheck className="h-4 w-4 text-primary" /><span className="flex-1 text-sm font-semibold">Private by default</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div><div className="flex items-center gap-3 py-3"><UserRound className="h-4 w-4 text-primary" /><span className="flex-1 text-sm font-semibold">Managed by Clerk</span><ChevronRight className="h-4 w-4 text-muted-foreground" /></div></div><button onClick={() => signOut({ redirectUrl: '/' })} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-bold text-destructive transition-colors hover:bg-[hsl(var(--destructive)/.08)]" data-testid="button-settings-log-out"><LogOut className="h-4 w-4" /> Log out</button></section></div></div></WorkspaceShell>;
}