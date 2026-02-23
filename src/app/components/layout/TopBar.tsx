import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Plus,
  Bell,
  User,
  PanelRight,
  Command,
  LogOut,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { useNotifications, useAppState, useSettings } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface TopBarProps {
  onToggleCopilot: () => void;
  copilotOpen: boolean;
  onOpenCommandPalette: () => void;
  onOpenAddMenu: () => void;
}

export function TopBar({ onToggleCopilot, copilotOpen, onOpenCommandPalette, onOpenAddMenu }: TopBarProps) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const { refreshData, refreshing, lastRefreshedAt } = useAppState();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useNotifications();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const lastRefreshLabel = lastRefreshedAt
    ? new Date(lastRefreshedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'Never';

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    markNotificationRead(notif.id);
    // Navigate based on notification type
    if (notif.action === 'View' || notif.action === 'Track') {
      navigate('/shipments');
    } else if (notif.action === 'Review') {
      navigate('/');
    }
    setNotifOpen(false);
  };

  const handleRefresh = async () => {
    const ok = await refreshData();
    if (ok) {
      toast.success('Data refreshed');
    } else {
      toast.error('Refresh failed. Please try again.');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-20">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2 mr-2">
        <div className="w-7 h-7 rounded-lg bg-cobalt flex items-center justify-center">
          <span className="text-white text-[11px] tracking-tight" style={{ fontWeight: 700 }}>U</span>
        </div>
      </div>

      {/* Search */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors flex-1 max-w-[420px] cursor-pointer"
      >
        <Search size={16} className="text-muted-foreground" strokeWidth={1.8} />
        <span className="text-muted-foreground text-[0.85rem]" style={{ fontWeight: 400 }}>Search shipments, tracking, returns…</span>
        <div className="ml-auto hidden sm:flex items-center gap-1 text-muted-foreground/60">
          <Command size={12} />
          <span className="text-[0.7rem]">K</span>
        </div>
      </button>

      <div className="flex-1" />

      {/* Refresh button */}
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        title={`Last refreshed: ${lastRefreshLabel}`}
        className="h-9 px-3 rounded-xl bg-white border border-border text-foreground flex items-center gap-1.5 hover:bg-accent transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
        <span className="hidden sm:inline text-[0.8rem]" style={{ fontWeight: 500 }}>
          {refreshing ? 'Refreshing' : 'Refresh'}
        </span>
      </button>

      {/* Add button */}
      <button
        onClick={onOpenAddMenu}
        className="h-9 px-3.5 rounded-xl bg-cobalt text-white flex items-center gap-1.5 hover:bg-cobalt-dark transition-colors cursor-pointer"
      >
        <Plus size={16} strokeWidth={2.2} />
        <span className="hidden sm:inline text-[0.85rem]">Add</span>
      </button>

      {/* Notifications */}
      <div className="relative">
        <button
          onClick={() => setNotifOpen(!notifOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors relative cursor-pointer"
        >
          <Bell size={18} strokeWidth={1.8} className="text-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-danger text-white text-[0.6rem] flex items-center justify-center" style={{ fontWeight: 600 }}>
              {unreadCount}
            </span>
          )}
        </button>

        {/* Notification dropdown */}
        {notifOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
            <div className="absolute right-0 top-12 w-[360px] bg-white rounded-2xl shadow-lg border border-border z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span style={{ fontWeight: 600 }}>Notifications</span>
                <button
                  onClick={() => {
                    markAllNotificationsRead();
                  }}
                  className="text-cobalt text-[0.8rem] cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[0.85rem] text-muted-foreground">No notifications</p>
                  </div>
                ) : (
                  <>
                    <div className="px-4 py-2">
                      <span className="text-[0.7rem] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>Recent</span>
                    </div>
                    {notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`px-4 py-3 hover:bg-accent/50 cursor-pointer flex items-start gap-3 ${!notif.read ? 'bg-cobalt-light/30' : ''}`}
                      >
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? 'bg-cobalt' : 'bg-transparent'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.85rem] text-foreground truncate" style={{ fontWeight: notif.read ? 400 : 500 }}>
                            {notif.title}
                          </p>
                          <p className="text-[0.75rem] text-muted-foreground mt-0.5">{notif.timestamp}</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotificationClick(notif);
                          }}
                          className="text-cobalt text-[0.8rem] flex-shrink-0 cursor-pointer"
                          style={{ fontWeight: 500 }}
                        >
                          {notif.action}
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Profile */}
      <div className="relative">
        <button
          onClick={() => setProfileOpen(!profileOpen)}
          className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-accent transition-colors cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-cobalt-light flex items-center justify-center">
            <User size={16} className="text-cobalt" strokeWidth={1.8} />
          </div>
        </button>

        {/* Profile dropdown */}
        {profileOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
            <div className="absolute right-0 top-12 w-[240px] bg-white rounded-2xl shadow-lg border border-border z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[0.9rem]" style={{ fontWeight: 600 }}>{settings.name || user?.email}</p>
                <p className="text-[0.78rem] text-muted-foreground">{user?.email}</p>
              </div>
              <div className="py-2">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 cursor-pointer text-left"
                >
                  <Settings size={16} className="text-muted-foreground" />
                  <span className="text-[0.85rem]">Settings</span>
                </button>
                <button
                  onClick={async () => {
                    await signOut();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 cursor-pointer text-left text-danger"
                >
                  <LogOut size={16} className="text-danger" />
                  <span className="text-[0.85rem]">Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Copilot toggle */}
      <button
        onClick={onToggleCopilot}
        className={`hidden lg:flex w-10 h-10 rounded-xl items-center justify-center transition-colors cursor-pointer ${
          copilotOpen ? 'bg-cobalt-light text-cobalt' : 'hover:bg-accent text-muted-foreground'
        }`}
        title="Toggle Copilot"
      >
        <PanelRight size={18} strokeWidth={1.8} />
      </button>
    </header>
  );
}
