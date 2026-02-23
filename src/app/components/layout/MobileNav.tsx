import { NavLink } from 'react-router';
import {
  Home,
  Truck,
  RotateCcw,
  MoreHorizontal,
} from 'lucide-react';
import { useState } from 'react';
import {
  BarChart3,
  Plug,
  Settings,
  X,
} from 'lucide-react';

const mainTabs = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/shipments', icon: Truck, label: 'Shipments' },
  { to: '/returns', icon: RotateCcw, label: 'Returns' },
];

const moreItems = [
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/connections', icon: Plug, label: 'Connections' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      {/* More sheet */}
      {moreOpen && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setMoreOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 lg:hidden pb-8">
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-border">
              <span style={{ fontWeight: 600 }}>More</span>
              <button onClick={() => setMoreOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent cursor-pointer">
                <X size={18} />
              </button>
            </div>
            <div className="py-2">
              {moreItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-3 text-[0.9rem] ${
                      isActive ? 'text-cobalt bg-cobalt-light/50' : 'text-foreground hover:bg-accent'
                    }`
                  }
                  style={{ fontWeight: 500 }}
                >
                  <item.icon size={20} strokeWidth={1.8} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Tab bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border z-30 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16">
          {mainTabs.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 flex-1 h-full relative ${
                  isActive ? 'text-cobalt' : 'text-muted-foreground'
                }`
              }
            >
              <item.icon size={20} strokeWidth={1.8} />
              <span className="text-[0.65rem]" style={{ fontWeight: 500 }}>{item.label}</span>
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground cursor-pointer"
          >
            <MoreHorizontal size={20} strokeWidth={1.8} />
            <span className="text-[0.65rem]" style={{ fontWeight: 500 }}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
