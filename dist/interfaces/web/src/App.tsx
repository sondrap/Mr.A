import { useEffect, useState } from 'react';
import { Route, Router, Switch, Redirect } from 'wouter';
import { useSession, initAuthListener } from './store';
import { auth, api } from './api';
import type { CurrentUser } from './api';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectPage } from './pages/ProjectPage';
import { WorkflowPage } from './pages/WorkflowPage';
import { ChatPage } from './pages/ChatPage';
import { AdminPage } from './pages/AdminPage';
import { AppShell } from './components/AppShell';
import { OnboardingModal } from './components/OnboardingModal';
import { SourceSidePanel } from './components/SourceSidePanel';
import { Toast } from './components/Toast';

// Routes are declared flat. Auth-protected routes redirect to /login when unauthenticated.
export default function App() {
  const user = useSession((s) => s.user);
  const isLoading = useSession((s) => s.isLoading);
  const hasLoaded = useSession((s) => s.hasLoaded);
  const setUser = useSession((s) => s.setUser);
  const [refreshing, setRefreshing] = useState(false);

  // Initialize auth listener once. Fetch current user on mount and after auth transitions.
  useEffect(() => {
    initAuthListener();
    let cancelled = false;
    const load = async () => {
      try {
        if (auth.isAuthenticated()) {
          const { user } = await api.getCurrentUser();
          if (!cancelled) setUser(user as CurrentUser | null);
        } else {
          if (!cancelled) setUser(null);
        }
      } catch (err) {
        console.error('Failed to load current user', err);
        if (!cancelled) setUser(null);
      }
    };
    load();
    // Refresh current user whenever auth state changes (verify, logout, key rotate).
    const unsub = auth.onAuthStateChanged(() => {
      load();
    });
    return () => {
      cancelled = true;
      unsub?.();
    };
  }, [setUser]);

  // Initial blank state while loading — keep it minimal, no spinner splash
  if (isLoading && !hasLoaded) {
    return <BootSplash />;
  }

  return (
    <Router>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route>{user ? <AuthedRoutes /> : <Redirect to="/login" replace />}</Route>
      </Switch>
      <SourceSidePanel />
      <Toast />
    </Router>
  );
}

function AuthedRoutes() {
  return (
    <>
      <AppShell>
        <Switch>
          <Route path="/" component={DashboardPage} />
          <Route path="/projects/:projectId" component={ProjectPage} />
          <Route path="/workflows/:runId" component={WorkflowPage} />
          <Route path="/chat" component={ChatPage} />
          <Route path="/chat/:threadId" component={ChatPage} />
          <Route path="/chat/project/:projectId" component={ChatPage} />
          <Route path="/chat/project/:projectId/:threadId" component={ChatPage} />
          <Route path="/admin/:tab?" component={AdminPage} />
          <Route>
            <Redirect to="/" />
          </Route>
        </Switch>
      </AppShell>
      <OnboardingModal />
    </>
  );
}

function BootSplash() {
  return (
    <div
      style={{
        height: '100dvh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        className="type-label text-dust"
        style={{ letterSpacing: '0.15em', opacity: 0.6 }}
      >
        Mr. A
      </div>
    </div>
  );
}
