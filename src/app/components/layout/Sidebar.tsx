import { NavLink } from 'react-router';
import {
  Home,
  Truck,
  RotateCcw,
  BarChart3,
  Plug,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/shipments', icon: Truck, label: 'Shipments' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/connections', icon: Plug, label: 'Connections' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-[240px] h-screen bg-white border-r border-border fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 h-16 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-cobalt flex items-center justify-center">
          <span className="text-white text-[11px] tracking-tight" style={{ fontWeight: 700 }}>U</span>
        </div>
        <span className="text-foreground tracking-[-0.02em]" style={{ fontSize: '1.15rem', fontWeight: 700 }}>Unify</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[0.9rem] ${
                isActive
                  ? 'bg-cobalt-light text-cobalt'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`
            }
            style={{ fontWeight: 500 }}
          >
            <item.icon size={18} strokeWidth={1.8} />
            <span className="flex-1">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Sync status */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
          <span>Synced just now</span>
        </div>
      </div>
    </aside>
  );
}
