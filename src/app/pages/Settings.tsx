import { useState, useEffect } from 'react';
import {
  User,
  Bell,
  Eye,
  Lock,
  Download,
  Trash2,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useSettings, useAppState } from '../context/AppContext';
import { ConfirmationModal } from '../components/modals/ConfirmationModal';
import { toast } from 'sonner';

interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-[0.88rem]" style={{ fontWeight: 500 }}>{label}</p>
        {description && <p className="text-[0.78rem] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full flex items-center transition-colors cursor-pointer flex-shrink-0 ${
          value ? 'bg-cobalt' : 'bg-[#D1D5DB]'
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
          value ? 'translate-x-[22px]' : 'translate-x-[2px]'
        }`} />
      </button>
    </div>
  );
}

const sections = [
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'notifications', icon: Bell, label: 'Notifications' },
  { id: 'privacy', icon: Eye, label: 'Privacy & Data Controls' },
  { id: 'security', icon: Lock, label: 'Security' },
  { id: 'export', icon: Download, label: 'Export / Delete Data' },
  { id: 'help', icon: HelpCircle, label: 'Help & Support' },
];

export function Settings() {
  const { settings, updateSettings } = useSettings();
  const { exportData, deleteAllData } = useAppState();
  const [activeSection, setActiveSection] = useState('profile');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: settings.name,
    email: settings.email,
    defaultCurrency: settings.defaultCurrency,
  });

  useEffect(() => {
    setProfileForm({
      name: settings.name,
      email: settings.email,
      defaultCurrency: settings.defaultCurrency,
    });
  }, [settings]);

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto">
      <h2 className="text-foreground mb-6">Settings</h2>

      <div className="lg:hidden mb-4 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`h-9 px-3.5 rounded-xl border text-[0.8rem] whitespace-nowrap transition-colors cursor-pointer ${
                activeSection === section.id
                  ? 'border-cobalt bg-cobalt-light text-cobalt'
                  : 'border-border bg-white text-muted-foreground hover:bg-accent'
              }`}
              style={{ fontWeight: 500 }}
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar nav */}
        <div className="hidden lg:block w-[220px] flex-shrink-0">
          <div className="bg-white rounded-2xl border border-border overflow-hidden">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-[0.85rem] text-left cursor-pointer transition-colors ${
                  activeSection === section.id
                    ? 'bg-cobalt-light text-cobalt'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
                style={{ fontWeight: activeSection === section.id ? 500 : 400 }}
              >
                <section.icon size={16} strokeWidth={1.8} />
                {section.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeSection === 'profile' && (
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <h3 className="mb-5">Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                  />
                </div>
                <div>
                  <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
                  />
                </div>
                <div>
                  <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Default Currency</label>
                  <select
                    value={profileForm.defaultCurrency}
                    onChange={(e) => setProfileForm({ ...profileForm, defaultCurrency: e.target.value })}
                    className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt cursor-pointer"
                  >
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    updateSettings(profileForm);
                    toast.success('Profile updated');
                  }}
                  className="h-10 px-5 rounded-xl bg-cobalt text-white text-[0.85rem] hover:bg-cobalt-dark cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Save changes
                </button>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <h3 className="mb-5">Notifications</h3>
              <div className="divide-y divide-border">
                <Toggle
                  label="Delivery alerts"
                  description="Get notified when packages are out for delivery or delivered"
                  value={settings.notifications.deliveryAlerts}
                  onChange={(val) => updateSettings({ notifications: { ...settings.notifications, deliveryAlerts: val } })}
                />
                <Toggle
                  label="Return deadline reminders"
                  description="Remind me before return windows close"
                  value={settings.notifications.returnDeadlineReminders}
                  onChange={(val) => updateSettings({ notifications: { ...settings.notifications, returnDeadlineReminders: val } })}
                />
                <Toggle
                  label="Refund updates"
                  description="Notify when refunds are issued or expected"
                  value={settings.notifications.refundUpdates}
                  onChange={(val) => updateSettings({ notifications: { ...settings.notifications, refundUpdates: val } })}
                />
                <Toggle
                  label="New order detected"
                  description="Alert when a new order is found from email or connected accounts"
                  value={settings.notifications.newOrderDetected}
                  onChange={(val) => updateSettings({ notifications: { ...settings.notifications, newOrderDetected: val } })}
                />
                <Toggle
                  label="Low confidence matches"
                  description="Notify about orders that need manual review"
                  value={settings.notifications.lowConfidenceMatches}
                  onChange={(val) => updateSettings({ notifications: { ...settings.notifications, lowConfidenceMatches: val } })}
                />
                <Toggle
                  label="Weekly summary"
                  description="Receive a weekly email digest"
                  value={settings.notifications.weeklySummary}
                  onChange={(val) => updateSettings({ notifications: { ...settings.notifications, weeklySummary: val } })}
                />
              </div>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-[0.85rem] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>Notification channels</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => updateSettings({ notifications: { ...settings.notifications, channels: { ...settings.notifications.channels, inApp: !settings.notifications.channels.inApp } } })}
                    className={`p-3 rounded-xl border text-center cursor-pointer ${
                      settings.notifications.channels.inApp ? 'border-cobalt bg-cobalt-light' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <p className={`text-[0.85rem] ${settings.notifications.channels.inApp ? 'text-cobalt' : 'text-muted-foreground'}`} style={{ fontWeight: 500 }}>In-app</p>
                  </button>
                  <button
                    onClick={() => updateSettings({ notifications: { ...settings.notifications, channels: { ...settings.notifications.channels, email: !settings.notifications.channels.email } } })}
                    className={`p-3 rounded-xl border text-center cursor-pointer ${
                      settings.notifications.channels.email ? 'border-cobalt bg-cobalt-light' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <p className={`text-[0.85rem] ${settings.notifications.channels.email ? 'text-cobalt' : 'text-muted-foreground'}`} style={{ fontWeight: 500 }}>Email</p>
                  </button>
                  <button
                    onClick={() => updateSettings({ notifications: { ...settings.notifications, channels: { ...settings.notifications.channels, push: !settings.notifications.channels.push } } })}
                    className={`p-3 rounded-xl border text-center cursor-pointer ${
                      settings.notifications.channels.push ? 'border-cobalt bg-cobalt-light' : 'border-border hover:bg-accent'
                    }`}
                  >
                    <p className={`text-[0.85rem] ${settings.notifications.channels.push ? 'text-cobalt' : 'text-muted-foreground'}`} style={{ fontWeight: 500 }}>Push</p>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <h3 className="mb-5">Privacy & Data Controls</h3>
              <div className="divide-y divide-border">
                <Toggle
                  label="Show delivery address details"
                  description="Display full address instead of masked city/state"
                  value={settings.privacy.showDeliveryAddressDetails}
                  onChange={(val) => updateSettings({ privacy: { ...settings.privacy, showDeliveryAddressDetails: val } })}
                />
                <Toggle
                  label="Auto-detect orders from email"
                  description="Automatically scan email for order confirmations"
                  value={settings.privacy.autoDetectOrdersFromEmail}
                  onChange={(val) => updateSettings({ privacy: { ...settings.privacy, autoDetectOrdersFromEmail: val } })}
                />
                <Toggle
                  label="Auto-link tracking numbers"
                  description="Automatically match tracking numbers to orders"
                  value={settings.privacy.autoLinkTrackingNumbers}
                  onChange={(val) => updateSettings({ privacy: { ...settings.privacy, autoLinkTrackingNumbers: val } })}
                />
                <Toggle
                  label="Return deadline reminders"
                  description="Proactively alert about approaching return deadlines"
                  value={settings.privacy.returnDeadlineReminders}
                  onChange={(val) => updateSettings({ privacy: { ...settings.privacy, returnDeadlineReminders: val } })}
                />
              </div>
              <div className="mt-5 pt-5 border-t border-border">
                <p className="text-[0.85rem] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>Email scan scope</p>
                <div className="space-y-2">
                  {[
                    { label: 'Scan all email', value: 'all' },
                    { label: 'Only labeled folder', value: 'labeled' },
                    { label: 'Only forwarded receipts', value: 'forwarded' },
                  ].map((opt) => (
                    <label key={opt.value} className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-accent">
                      <input
                        type="radio"
                        name="scan-scope"
                        checked={settings.privacy.emailScanScope === opt.value}
                        onChange={() => updateSettings({ privacy: { ...settings.privacy, emailScanScope: opt.value as 'all' | 'labeled' | 'forwarded' } })}
                        className="accent-cobalt"
                      />
                      <span className="text-[0.85rem]">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <h3 className="mb-5">Security</h3>
              <div className="divide-y divide-border">
                <Toggle
                  label="Two-factor authentication"
                  description="Add an extra layer of security to your account"
                  value={settings.security.twoFactorEnabled}
                  onChange={(val) => updateSettings({ security: { ...settings.security, twoFactorEnabled: val } })}
                />
              </div>
            </div>
          )}

          {activeSection === 'export' && (
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <h3 className="mb-5">Export / Delete Data</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Download size={18} className="text-cobalt" />
                    <div className="flex-1">
                      <p className="text-[0.9rem]" style={{ fontWeight: 500 }}>Export all data</p>
                      <p className="text-[0.78rem] text-muted-foreground">Download all your orders, returns, and shipment data as JSON</p>
                    </div>
                    <button
                      onClick={() => {
                        exportData();
                        toast.success('Data exported successfully');
                      }}
                      className="h-9 px-4 rounded-xl bg-cobalt text-white text-[0.85rem] cursor-pointer w-full sm:w-auto"
                      style={{ fontWeight: 500 }}
                    >
                      Export
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-danger/30 bg-danger-light">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Trash2 size={18} className="text-danger" />
                    <div className="flex-1">
                      <p className="text-[0.9rem] text-danger" style={{ fontWeight: 500 }}>Delete all data</p>
                      <p className="text-[0.78rem] text-danger/70">Permanently delete all your data. This cannot be undone.</p>
                    </div>
                    <button
                      onClick={() => setDeleteModalOpen(true)}
                      className="h-9 px-4 rounded-xl border border-danger text-danger text-[0.85rem] cursor-pointer w-full sm:w-auto"
                      style={{ fontWeight: 500 }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'help' && (
            <div className="bg-white rounded-2xl border border-border p-5 sm:p-6">
              <h3 className="mb-5">Help & Support</h3>
              <div className="space-y-3">
                {[
                  { label: 'Getting started guide', desc: 'Learn how to set up Unify' },
                  { label: 'FAQs', desc: 'Common questions and answers' },
                  { label: 'Contact support', desc: 'Reach our support team' },
                  { label: 'Privacy policy', desc: 'How we handle your data' },
                  { label: 'Terms of service', desc: 'Legal terms' },
                ].map((item) => (
                  <button
                    key={item.label}
                    className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-border hover:bg-accent cursor-pointer text-left"
                  >
                    <div className="flex-1">
                      <p className="text-[0.88rem]" style={{ fontWeight: 500 }}>{item.label}</p>
                      <p className="text-[0.78rem] text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground/40" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmationModal
        open={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          deleteAllData();
          toast.success('All data deleted');
        }}
        title="Delete All Data"
        description="This will permanently delete all your orders, returns, shipments, and other data. This action cannot be undone."
        confirmLabel="Delete All Data"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
