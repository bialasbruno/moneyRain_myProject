import {
  BadgeCheck,
  BarChart3,
  Boxes,
  CircleDollarSign,
  Goal,
  Landmark,
  Map,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { ProgressionCelebration } from './ProgressionCelebration';

const navigation = [
  { to: '/dashboard', label: 'Pulpit', icon: BarChart3 },
  { to: '/journey', label: 'Droga', icon: Map },
  { to: '/etf', label: 'ETF', icon: CircleDollarSign },
  { to: '/bonds', label: 'Obligacje', icon: Landmark },
  { to: '/goals', label: 'Cele', icon: Goal },
  { to: '/vault', label: 'Skarbiec', icon: Boxes },
  { to: '/achievements', label: 'Osiągnięcia', icon: BadgeCheck },
  { to: '/settings', label: 'Ustawienia', icon: Settings },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <button
        className="mobile-menu"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Menu"
      >
        {open ? <X /> : <Menu />}
      </button>
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <div className="brand">
          <div className="brand-mark">
            <Sparkles size={19} />
          </div>
          <div>
            <strong>MONEY RAIN</strong>
            <span>Droga do miliona</span>
          </div>
        </div>
        <nav>
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)}>
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="privacy-seal">
          <ShieldCheck size={19} />
          <div>
            <strong>Prywatny skarbiec</strong>
            <span>Chroniony przez Access</span>
          </div>
        </div>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
      <nav className="mobile-tabs" aria-label="Główna nawigacja">
        {navigation.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to}>
            <Icon size={19} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <ProgressionCelebration />
    </div>
  );
}
