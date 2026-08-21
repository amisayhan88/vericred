import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Award,
  ShieldCheck,
  Activity,
  History,
  BarChart3,
  User,
  Settings,
  HelpCircle,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/issue', label: 'Issue Credential', icon: Award },
  { href: '/verify', label: 'Verify ZK Proof', icon: ShieldCheck },
  { href: '/activity', label: 'Activity Feed', icon: Activity },
  { href: '/transactions', label: 'Transactions', icon: History },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/profile', label: 'My Vault', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/help', label: 'Help & FAQ', icon: HelpCircle },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="hidden md:flex w-60 shrink-0 bg-canvas border-r border-hairline p-4 min-h-[calc(100vh-64px)] flex-col justify-between">
      <div className="space-y-1">
        <div className="px-3 py-2 text-caption font-semibold tracking-wider text-muted uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href || (location.pathname === '/' && item.href === '/dashboard');
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-nav-link transition-all duration-150 ${
                isActive
                  ? 'bg-canvas text-ink font-semibold shadow-soft border border-hairline'
                  : 'text-muted hover:bg-surface-soft hover:text-ink'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-ink' : 'text-muted'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom Info Card */}
      <div className="card-feature p-4" style={{ padding: '16px' }}>
        <div className="flex items-center gap-2 text-body-sm font-semibold text-ink">
          <ShieldCheck className="w-4 h-4 text-success" />
          <span>Zero-Knowledge</span>
        </div>
        <p className="text-caption text-muted mt-1.5 leading-relaxed">
          Selective disclosure via Midnight Compact ZK circuits.
        </p>
      </div>
    </aside>
  );
};
