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
    colorPrimary: '#173d37',
    colorForeground: '#173d37',
    colorMutedForeground: '#62736e',
    colorDanger: '#bd4137',
    colorBackground: '#fbfaf6',
    colorInput: '#f4f1e9',
    colorInputForeground: '#173d37',
    colorNeutral: '#d8d1c3',
    fontFamily: 'DM Sans, sans-serif',
    borderRadius: '0.85rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-[#fbfaf6] rounded-[1.5rem] w-[440px] max-w-full overflow-hidden border border-[#d8d1c3]',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'text-[#173d37] font-semibold',
    headerSubtitle: 'text-[#62736e]',
    socialButtonsBlockButtonText: 'text-[#173d37] font-semibold',
    formFieldLabel: 'text-[#173d37] font-semibold',
    footerActionLink: 'text-[#173d37] font-bold',
    footerActionText: 'text-[#62736e]',
    dividerText: 'text-[#62736e]',
    identityPreviewEditButton: 'text-[#173d37]',
    formFieldSuccessText: 'text-[#496d43]',
    alertText: 'text-[#bd4137]',
    logoBox: 'h-12',
    logoImage: 'h-11 w-11 rounded-xl',
    socialButtonsBlockButton: 'border-[#d8d1c3] bg-[#f4f1e9] hover:bg-[#ebe5d8]',
    formButtonPrimary: 'bg-[#173d37] text-[#fbfaf6] hover:bg-[#24544c]',
    formFieldInput: 'border-[#d8d1c3] bg-[#f4f1e9] text-[#173d37]',
    footerAction: 'border-t border-[#d8d1c3]',
    dividerLine: 'bg-[#d8d1c3]',
    alert: 'bg-[#f7e4df] border-[#e8b4aa]',
    otpCodeFieldInput: 'border-[#d8d1c3] bg-[#f4f1e9] text-[#173d37]',
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
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10"><div className="absolute left-5 top-5 md:left-8 md:top-8"><Link href="/" className="text-sm font-bold text-primary" data-testid="link-auth-home">← Back to moneywise</Link></div><SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} /></div>;
}

function SignUpPage() {
  return <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4 py-10"><div className="absolute left-5 top-5 md:left-8 md:top-8"><Link href="/" className="text-sm font-bold text-primary" data-testid="link-auth-home">← Back to moneywise</Link></div><SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} /></div>;
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