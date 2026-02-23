import { Outlet } from 'react-router';
import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { CopilotPanel } from './CopilotPanel';
import { CommandPalette } from './CommandPalette';
import { AddMenu } from './AddMenu';

export function RootLayout() {
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen bg-background font-sans">
      <Sidebar />
      <div
        className={`lg:ml-[240px] transition-all duration-300 ${
          copilotOpen ? 'lg:mr-[320px]' : ''
        }`}
      >
        <TopBar
          onToggleCopilot={() => setCopilotOpen(!copilotOpen)}
          copilotOpen={copilotOpen}
          onOpenCommandPalette={() => setCommandOpen(true)}
          onOpenAddMenu={() => setAddMenuOpen(true)}
        />
        <main className="pb-20 lg:pb-0">
          <Outlet />
        </main>
      </div>
      <CopilotPanel open={copilotOpen} onClose={() => setCopilotOpen(false)} />
      <MobileNav />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      <AddMenu open={addMenuOpen} onClose={() => setAddMenuOpen(false)} />
    </div>
  );
}
