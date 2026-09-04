import { useEffect, useState, type ReactNode } from 'react';
import { useClerk, useUser } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  CircleDollarSign,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import { initials } from '@/lib/format';

const navItems = [
  { href: '/dashboard', label: 'Overview', icon: BarChart3 },
  { href: '/transactions', label: 'Transactions', icon: ReceiptText },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`relative grid h-9 w-9 place-items-center rounded-xl border ${light ? 'border-[hsl(var(--accent)/.55)] bg-[hsl(var(--accent)/.12)] text-[hsl(var(--accent))]' : 'border-[hsl(var(--primary)/.55)] bg-[hsl(var(--primary)/.14)] text-[hsl(var(--primary))]'}`}>
        <span className="absolute inset-1 rounded-lg border border-current opacity-25" />
        <CircleDollarSign className="relative h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className={`display-font text-[1.55rem] font-bold tracking-[-0.06em] ${light ? 'text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--foreground))]'}`}>
        moneywise
      </span>
    </div>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useUser();
  const { signOut } = useClerk();

  return (
    <div className="paper-noise min-h-[100dvh] bg-background">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-5 py-6 text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="focus-ring rounded-lg" data-testid="link-brand-dashboard"><BrandMark light /></Link>
          <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-sidebar-foreground/70 md:hidden" aria-label="Close menu" data-testid="button-close-menu"><X className="h-5 w-5" /></button>
        </div>
        <div className="mt-12">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.19em] text-sidebar-foreground/40">Money cockpit</p>
          <nav className="mt-3 space-y-1.5">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = location === href;
              return (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={`focus-ring group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`} data-testid={`link-nav-${label.toLowerCase()}`}>
                  <Icon className={`h-[18px] w-[18px] ${active ? 'text-[hsl(var(--secondary))]' : ''}`} />
                  <span>{label}</span>
                  {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))] shadow-[0_0_10px_hsl(var(--primary)/.8)]" />}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="scan-overlay mt-auto rounded-2xl border border-[hsl(var(--secondary)/.25)] bg-[hsl(var(--secondary)/.06)] p-4">
          <Sparkles className="h-5 w-5 text-[hsl(var(--secondary))]" />
          <p className="mt-3 text-sm font-semibold">Read the signal.</p>
          <p className="mt-1 text-xs leading-relaxed text-sidebar-foreground/55">Keep your money story current, one small note at a time.</p>
        </div>
        <div className="mt-5 flex items-center gap-3 border-t border-sidebar-border pt-5">
           <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.14)] text-xs font-bold text-[hsl(var(--primary))]" data-testid="avatar-user">{initials(user?.fullName || user?.firstName)}</div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" data-testid="text-user-name">{user?.fullName || user?.firstName || 'Your account'}</p>
            <p className="truncate text-xs text-sidebar-foreground/50">{user?.primaryEmailAddress?.emailAddress || 'Personal workspace'}</p>
          </div>
          <button onClick={() => signOut({ redirectUrl: '/' })} className="rounded-lg p-1.5 text-sidebar-foreground/55 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground" aria-label="Log out" data-testid="button-log-out"><LogOut className="h-4 w-4" /></button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-30 bg-[hsl(var(--foreground)/.28)] md:hidden" onClick={() => setOpen(false)} aria-label="Close navigation overlay" data-testid="button-nav-overlay" />}
      <main className="min-h-[100dvh] md:pl-[248px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/80 px-5 backdrop-blur-xl md:px-10">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-muted-foreground md:hidden" aria-label="Open menu" data-testid="button-open-menu"><Menu className="h-5 w-5" /></button>
           <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground md:flex"><span className="h-2 w-2 rounded-full bg-[hsl(var(--secondary))] shadow-[0_0_10px_hsl(var(--secondary)/.8)]" /> System live / private workspace</div>
          <div className="ml-auto flex items-center gap-4">
             <Link href="/transactions" className="hidden items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-[hsl(var(--secondary))] sm:flex" data-testid="link-quick-add"><span className="grid h-6 w-6 place-items-center rounded-md bg-[hsl(var(--primary)/.15)] text-lg leading-none text-primary">+</span> Add transaction</Link>
            <Link href="/settings" className="group flex items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-2 transition-colors hover:bg-muted" data-testid="link-profile-settings">
               <div className="grid h-8 w-8 place-items-center rounded-full border border-[hsl(var(--secondary)/.45)] bg-[hsl(var(--secondary)/.12)] text-xs font-bold text-[hsl(var(--secondary))]">{initials(user?.fullName || user?.firstName)}</div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-hover:translate-y-0.5" />
            </Link>
          </div>
        </header>
        <div className="mx-auto w-full max-w-[1400px] px-5 py-8 md:px-10 md:py-10">{children}</div>
      </main>
    </div>
  );
}

export function AuthRequired({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => {
    if (isLoaded && !isSignedIn && location !== '/sign-in') setLocation('/sign-in');
  }, [isLoaded, isSignedIn, location, setLocation]);
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;
  if (!isSignedIn) {
    return null;
  }
  return <>{children}</>;
}

export function PublicNav() {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 md:px-8">
      <Link href="/" className="focus-ring rounded-lg" data-testid="link-public-brand"><BrandMark /></Link>
      <div className="flex items-center gap-3">
        <Link href="/sign-in" className="rounded-xl px-3 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground" data-testid="link-sign-in">Sign in</Link>
        <Link href="/sign-up" className="group flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5" data-testid="link-get-started">Get started <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></Link>
      </div>
    </header>
  );
}