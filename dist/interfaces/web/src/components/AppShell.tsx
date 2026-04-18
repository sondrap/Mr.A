import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  IconLayoutGrid,
  IconMessage,
  IconBolt,
  IconShield,
  IconMenu2,
  IconX,
} from '@tabler/icons-react';
import { useSession } from '../store';
import { auth } from '../api';
import { Wordmark } from './Wordmark';

// Global app shell: top bar + collapsible left rail + main content.
// Desktop: left rail at 240px. Mobile: full-height drawer.
export function AppShell({ children }: { children: ReactNode }) {
  const user = useSession((s) => s.user);
  const [location] = useLocation();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const isFree = !user?.roles?.includes('student') && !user?.roles?.includes('admin');
  const isAdmin = user?.roles?.includes('admin') ?? false;

  const navItems = [
    { to: '/', label: 'PROJECTS', icon: IconLayoutGrid, match: (p: string) => p === '/' || p.startsWith('/projects') || p.startsWith('/workflows') },
    { to: '/chat', label: 'CHAT', icon: IconMessage, match: (p: string) => p.startsWith('/chat'), locked: isFree },
    // Workflows — tuck into Projects for now; per spec the workflows lane is under Projects
  ];
  if (isAdmin) {
    navItems.push({ to: '/admin', label: 'ADMIN', icon: IconShield, match: (p: string) => p.startsWith('/admin') });
  }

  const userInitials = (user?.displayName || user?.email || '??')
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const breadcrumb = computeBreadcrumb(location);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <header
        className="no-select"
        style={{
          height: 'var(--topbar-height)',
          minHeight: 'var(--topbar-height)',
          background: 'var(--color-asphalt)',
          borderBottom: '1px solid var(--color-graphite)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 var(--space-4)',
          gap: 'var(--space-4)',
          zIndex: 20,
        }}
      >
        <button
          className="mobile-only"
          onClick={() => setMobileDrawerOpen(true)}
          aria-label="Open menu"
          style={{ color: 'var(--color-dust)', padding: 4, display: 'none' }}
        >
          <IconMenu2 size={20} />
        </button>
        <Link href="/">
          <Wordmark size="small" />
        </Link>
        <div className="breadcrumb" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <span className="type-label text-dust">{breadcrumb}</span>
        </div>
        <button
          aria-label="Account"
          title={user?.email ?? ''}
          onClick={async () => {
            if (confirm('Log out?')) {
              await auth.logout();
            }
          }}
          style={{
            width: 32,
            height: 32,
            background: 'var(--color-gunmetal)',
            color: 'var(--color-bone-white)',
            fontFamily: 'var(--font-ui)',
            fontSize: 12,
            fontWeight: 600,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-graphite)',
            letterSpacing: '0.02em',
          }}
        >
          {userInitials}
        </button>
      </header>

      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        {/* Left rail — desktop */}
        <nav
          className="left-rail no-select"
          style={{
            width: 'var(--left-rail-width)',
            minWidth: 'var(--left-rail-width)',
            background: 'var(--color-ironwood)',
            borderRight: '1px solid var(--color-graphite)',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-4) 0',
          }}
        >
          <NavList items={navItems} currentPath={location} />
          <div style={{ flex: 1 }} />
          <UserFooter user={user} isFree={isFree} />
        </nav>

        {/* Mobile drawer overlay */}
        {mobileDrawerOpen && (
          <div
            onClick={() => setMobileDrawerOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 30,
            }}
          />
        )}
        <nav
          className={mobileDrawerOpen ? 'mobile-drawer open' : 'mobile-drawer'}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            bottom: 0,
            width: 'min(280px, 80vw)',
            background: 'var(--color-ironwood)',
            borderRight: '1px solid var(--color-graphite)',
            display: 'flex',
            flexDirection: 'column',
            padding: 'var(--space-4) 0',
            zIndex: 31,
            transform: mobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform var(--transition-base)',
          }}
        >
          <div style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Wordmark size="small" />
            <button onClick={() => setMobileDrawerOpen(false)} style={{ color: 'var(--color-dust)' }} aria-label="Close">
              <IconX size={20} />
            </button>
          </div>
          <NavList items={navItems} currentPath={location} onNavigate={() => setMobileDrawerOpen(false)} />
          <div style={{ flex: 1 }} />
          <UserFooter user={user} isFree={isFree} />
        </nav>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'hidden',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </main>
      </div>

      {/* Free-tier upgrade strip */}
      {isFree && (
        <a
          href="https://coffeedates.com/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-ironwood)',
            borderTop: '1px solid var(--color-graphite)',
            textAlign: 'center',
            color: 'var(--color-bone-white)',
          }}
        >
          <span className="type-label" style={{ color: 'var(--color-bone-white)' }}>
            Unlock the full Mojo Results Accelerator
          </span>
          <span style={{ marginLeft: 8, color: 'var(--color-mojo-red)' }}>→</span>
        </a>
      )}

      <style>{`
        @media (max-width: 768px) {
          .left-rail { display: none !important; }
          .mobile-only { display: inline-flex !important; }
          .breadcrumb { display: none; }
        }
        @media (min-width: 769px) {
          .mobile-drawer { display: none !important; }
        }
      `}</style>
    </div>
  );
}

interface NavItem {
  to: string;
  label: string;
  icon: typeof IconLayoutGrid;
  match: (p: string) => boolean;
  locked?: boolean;
}

function NavList({ items, currentPath, onNavigate }: { items: NavItem[]; currentPath: string; onNavigate?: () => void }) {
  return (
    <div style={{ padding: '0 var(--space-2)' }}>
      {items.map((item) => {
        const active = item.match(currentPath);
        const Icon = item.icon;
        if (item.locked) {
          return (
            <div
              key={item.to}
              title="Paid access only — reach out to Travis's team for full access."
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-3)',
                color: 'var(--color-smoke)',
                cursor: 'not-allowed',
                borderLeft: '2px solid transparent',
              }}
            >
              <Icon size={16} />
              <span className="type-label">{item.label}</span>
              <span className="type-mono-detail" style={{ marginLeft: 'auto', color: 'var(--color-smoke)' }}>PAID</span>
            </div>
          );
        }
        return (
          <Link
            key={item.to}
            href={item.to}
            onClick={onNavigate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-3)',
              padding: 'var(--space-3)',
              color: active ? 'var(--color-bone-white)' : 'var(--color-dust)',
              borderLeft: active ? '2px solid var(--color-mojo-red)' : '2px solid transparent',
              background: active ? 'var(--color-gunmetal)' : 'transparent',
              transition: 'all var(--transition-fast)',
              paddingLeft: 'calc(var(--space-3) + 2px)',
            }}
          >
            <Icon size={16} />
            <span className="type-label">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function UserFooter({ user, isFree }: { user: ReturnType<typeof useSession.getState>['user']; isFree: boolean }) {
  if (!user) return null;
  return (
    <div
      style={{
        padding: 'var(--space-3) var(--space-4)',
        borderTop: '1px solid var(--color-graphite)',
      }}
    >
      <div className="type-ui-body-small" style={{ color: 'var(--color-bone-white)' }}>
        {user.displayName || user.email}
      </div>
      <div
        className="type-mono-detail"
        style={{ color: isFree ? 'var(--color-smoke)' : 'var(--color-brass)', marginTop: 2 }}
      >
        {isFree ? 'FREE' : user.roles.includes('admin') ? 'ADMIN' : 'FULL ACCESS'}
      </div>
    </div>
  );
}

function computeBreadcrumb(path: string): string {
  if (path === '/') return 'PROJECTS';
  if (path.startsWith('/projects')) return 'PROJECTS';
  if (path.startsWith('/workflows')) return 'WORKFLOW';
  if (path.startsWith('/chat/project/')) return 'PROJECTS / CHAT';
  if (path.startsWith('/chat')) return 'CHAT';
  if (path.startsWith('/admin')) return 'ADMIN';
  return '';
}
