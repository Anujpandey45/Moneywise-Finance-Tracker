import { useEffect, useRef, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { ClerkProvider, SignIn, SignUp, useAuth, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Redirect, useLocation, Router as WouterRouter, Link } from 'wouter';
import Landing from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import Transactions from '@/pages/transactions';
import Settings from '@/pages/settings';
import { AuthRequired } from '@/components/moneywise-shell';

const queryClient = new QueryClient();
const clerkPubKey = publishableKeyFromHost(window.location.hostname, import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

if (!clerkPubKey) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env file');
}

function stripBase(path: string) {
  return basePath && path.startsWith(basePath) ? path.slice(basePath.length) || '/' : path;
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk',
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const,
  },
  variables: {
    colorPrimary: '#ff1744',
    colorForeground: '#e8eef8',
    colorMutedForeground: '#8a96aa',
    colorDanger: '#ff1744',
    colorBackground: '#0b0f19',
    colorInput: '#111827',
    colorInputForeground: '#e8eef8',
    colorNeutral: '#263248',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.7rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#0f1522] rounded-[1.5rem] w-[440px] max-w-full overflow-hidden border border-[#263248] shadow-[0_25px_80px_rgba(0,0,0,.35)]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#e8eef8] font-semibold',
    headerSubtitle: 'text-[#8a96aa]',
    socialButtonsBlockButtonText: 'text-[#e8eef8] font-semibold',
    formFieldLabel: 'text-[#e8eef8] font-semibold',
    footerActionLink: 'text-[#ff1744] font-bold',
    footerActionText: 'text-[#8a96aa]',
    dividerText: 'text-[#8a96aa]',
    identityPreviewEditButton: 'text-[#00e5ff]',
    formFieldSuccessText: 'text-[#00e5ff]',
    alertText: 'text-[#ff1744]',
    logoBox: 'h-12',
    logoImage: 'h-11 w-11 rounded-xl',
    socialButtonsBlockButton: 'border-[#263248] bg-[#111827] hover:bg-[#172235]',
    formButtonPrimary: 'bg-[#ff1744] text-white hover:bg-[#e3133d]',
    formFieldInput: 'border-[#263248] bg-[#111827] text-[#e8eef8]',
    footerAction: 'border-t border-[#263248]',
    dividerLine: 'bg-[#263248]',
    alert: 'bg-[#ff1744]/10 border-[#ff1744]/35',
    otpCodeFieldInput: 'border-[#263248] bg-[#111827] text-[#e8eef8]',
    formFieldRow: 'gap-2',
    main: 'gap-5',
  },
};

function HomeRedirect() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <div className="min-h-[100dvh] bg-background" />;
  return isSignedIn ? <Redirect to="/dashboard" /> : <Landing />;
}

function ProtectedPage({ children }: { children: ReactNode }) {
  return <AuthRequired>{children}</AuthRequired>;
}

function SignInPage() {
  return <AuthFrame><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></AuthFrame>;
}

function SignUpPage() {
  return <AuthFrame><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></AuthFrame>;
}

function AuthFrame({ children }: { children: ReactNode }) {
  return <div className="paper-noise relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-background px-4 py-14"><div className="money-grid absolute inset-0 opacity-50" /><div className="absolute -left-24 top-1/4 h-72 w-72 rounded-full bg-[hsl(var(--primary)/.14)] blur-3xl" /><div className="absolute -right-24 bottom-1/4 h-72 w-72 rounded-full bg-[hsl(var(--secondary)/.1)] blur-3xl" /><div className="absolute left-5 top-5 z-10 md:left-8 md:top-8"><Link href="/" className="focus-ring flex items-center gap-2 rounded-lg text-sm font-bold text-foreground transition-colors hover:text-[hsl(var(--secondary))]" data-testid="link-auth-home"><span className="grid h-7 w-7 place-items-center rounded-lg border border-[hsl(var(--primary)/.5)] bg-[hsl(var(--primary)/.12)] text-xs text-primary">MW</span> Back to moneywise</Link></div><div className="relative z-10 w-full max-w-[440px]">{children}</div></div>;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const client = useQueryClient();
  const previousUser = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (previousUser.current !== undefined && previousUser.current !== userId) client.clear();
      previousUser.current = userId;
    });
    return unsubscribe;
  }, [addListener, client]);
  return null;
}

function ClerkApp() {
  const [, setLocation] = useLocation();
  return <ClerkProvider publishableKey={clerkPubKey} proxyUrl={clerkProxyUrl} appearance={clerkAppearance} signInUrl={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} localization={{ signIn: { start: { title: 'Welcome back', subtitle: 'Your money is waiting.' } }, signUp: { start: { title: 'Make room for clarity', subtitle: 'A better home for your money story.' } } }} routerPush={(to) => setLocation(stripBase(to))} routerReplace={(to) => setLocation(stripBase(to), { replace: true })}><ClerkQueryClientCacheInvalidator /><Switch><Route path="/" component={HomeRedirect} /><Route path="/sign-in/*?" component={SignInPage} /><Route path="/sign-up/*?" component={SignUpPage} /><Route path="/dashboard" component={() => <ProtectedPage><Dashboard /></ProtectedPage>} /><Route path="/transactions" component={() => <ProtectedPage><Transactions /></ProtectedPage>} /><Route path="/settings" component={() => <ProtectedPage><Settings /></ProtectedPage>} /><Route component={NotFound} /></Switch></ClerkProvider>;
}

function Router() {
  return <RoutedErrorBoundary><ClerkApp /></RoutedErrorBoundary>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={basePath}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;