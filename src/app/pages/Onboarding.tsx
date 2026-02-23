import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Mail,
  ShoppingCart,
  Truck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Tag,
  Globe,
} from 'lucide-react';
import { useSettings, useAppState } from '../context/AppContext';
import { toast } from 'sonner';

const steps = [
  { id: 1, label: 'Connect' },
  { id: 2, label: 'Preferences' },
  { id: 3, label: 'Finish' },
];

export function Onboarding() {
  const navigate = useNavigate();
  const { updateSettings, settings } = useSettings();
  const { completeOnboarding } = useAppState();
  const [currentStep, setCurrentStep] = useState(1);
  const [connected, setConnected] = useState<string[]>([]);
  const [preferences, setPreferences] = useState({
    autoDetectOrders: true,
    showDeliveryAddress: false,
    returnDeadlineReminders: true,
    autoLinkTracking: true,
    defaultCurrency: 'USD',
  });

  const toggleConnect = (name: string) => {
    setConnected((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const handleFinish = async () => {
    await updateSettings({
      privacy: {
        ...settings.privacy,
        autoDetectOrdersFromEmail: preferences.autoDetectOrders,
        showDeliveryAddressDetails: preferences.showDeliveryAddress,
        returnDeadlineReminders: preferences.returnDeadlineReminders,
        autoLinkTrackingNumbers: preferences.autoLinkTracking,
      },
      defaultCurrency: preferences.defaultCurrency,
    });
    await completeOnboarding();
    toast.success('Onboarding completed!');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left: Progress */}
      <div className="hidden lg:flex flex-col w-[300px] bg-white border-r border-border p-8">
        <div className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-cobalt flex items-center justify-center">
            <span className="text-white text-[12px]" style={{ fontWeight: 700 }}>U</span>
          </div>
          <span className="text-foreground tracking-[-0.02em]" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Unify</span>
        </div>

        <div className="space-y-0">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  currentStep > step.id ? 'bg-cobalt' :
                  currentStep === step.id ? 'bg-cobalt' :
                  'bg-[#E5E7EB]'
                }`}>
                  {currentStep > step.id ? (
                    <CheckCircle2 size={16} className="text-white" />
                  ) : (
                    <span className={`text-[0.78rem] ${currentStep === step.id ? 'text-white' : 'text-muted-foreground'}`} style={{ fontWeight: 600 }}>
                      {step.id}
                    </span>
                  )}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-0.5 h-10 ${currentStep > step.id ? 'bg-cobalt' : 'bg-[#E5E7EB]'}`} />
                )}
              </div>
              <div className="pt-1">
                <p className={`text-[0.88rem] ${
                  currentStep === step.id ? 'text-foreground' : currentStep > step.id ? 'text-cobalt' : 'text-muted-foreground'
                }`} style={{ fontWeight: currentStep === step.id ? 600 : 400 }}>
                  {step.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto">
          <p className="text-[0.78rem] text-muted-foreground">
            Your data is encrypted and secure. We never share your personal information.
          </p>
        </div>
      </div>

      {/* Right: Step content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[560px]">
          {/* Mobile progress */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            {steps.map((step) => (
              <div key={step.id} className={`flex-1 h-1 rounded-full ${
                currentStep >= step.id ? 'bg-cobalt' : 'bg-[#E5E7EB]'
              }`} />
            ))}
          </div>

          {currentStep === 1 && (
            <div>
              <div className="mb-8">
                <h1 className="text-foreground mb-2">Connect your accounts</h1>
                <p className="text-[0.9rem] text-muted-foreground">
                  Unify works best when it can pull from your email and shopping accounts. Connect what you'd like — you can always add more later.
                </p>
              </div>

              <div className="space-y-3 mb-8">
                <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>Email</p>
                {[
                  { name: 'Gmail', icon: Mail, desc: 'Scan receipts from Gmail' },
                  { name: 'Outlook', icon: Mail, desc: 'Scan receipts from Outlook' },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => toggleConnect(item.name)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer text-left ${
                      connected.includes(item.name)
                        ? 'border-cobalt bg-cobalt-light'
                        : 'border-border bg-white hover:bg-accent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      connected.includes(item.name) ? 'bg-cobalt' : 'bg-[#F3F4F6]'
                    }`}>
                      <item.icon size={18} className={connected.includes(item.name) ? 'text-white' : 'text-muted-foreground'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.9rem]" style={{ fontWeight: 500 }}>{connected.includes(item.name) ? `${item.name} connected` : `Connect ${item.name}`}</p>
                      <p className="text-[0.78rem] text-muted-foreground">{item.desc}</p>
                    </div>
                    {connected.includes(item.name) && <CheckCircle2 size={20} className="text-cobalt" />}
                  </button>
                ))}

                <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wider pt-3" style={{ fontWeight: 600 }}>Merchants</p>
                {[
                  { name: 'Amazon', icon: ShoppingCart, desc: 'Import order history' },
                  { name: 'eBay', icon: Tag, desc: 'Import purchase history' },
                  { name: 'Shopify', icon: Globe, desc: 'Connect your Shopify stores' },
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => toggleConnect(item.name)}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer text-left ${
                      connected.includes(item.name)
                        ? 'border-cobalt bg-cobalt-light'
                        : 'border-border bg-white hover:bg-accent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      connected.includes(item.name) ? 'bg-cobalt' : 'bg-[#F3F4F6]'
                    }`}>
                      <item.icon size={18} className={connected.includes(item.name) ? 'text-white' : 'text-muted-foreground'} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[0.9rem]" style={{ fontWeight: 500 }}>{connected.includes(item.name) ? `${item.name} connected` : `Connect ${item.name}`}</p>
                      <p className="text-[0.78rem] text-muted-foreground">{item.desc}</p>
                    </div>
                    {connected.includes(item.name) && <CheckCircle2 size={20} className="text-cobalt" />}
                  </button>
                ))}
              </div>

              <div className="p-3 bg-[#F8F9FA] rounded-xl mb-6">
                <p className="text-[0.8rem] text-muted-foreground">
                  <Mail size={12} className="inline mr-1" />
                  Prefer forwarding? Send receipts to <span className="font-mono" style={{ fontWeight: 500 }}>receipts@unify.app</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="h-11 px-6 rounded-xl bg-cobalt text-white text-[0.9rem] flex items-center gap-2 hover:bg-cobalt-dark transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Continue <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="text-muted-foreground text-[0.85rem] cursor-pointer hover:text-foreground"
                  style={{ fontWeight: 500 }}
                >
                  Skip for now
                </button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>
              <div className="mb-8">
                <h1 className="text-foreground mb-2">Set your preferences</h1>
                <p className="text-[0.9rem] text-muted-foreground">
                  Customize how Unify works for you. These can be changed anytime in Settings.
                </p>
              </div>

              <div className="bg-white rounded-2xl border border-border p-5 mb-6 space-y-0 divide-y divide-border">
                <ToggleRow
                  label="Auto-detect orders from email"
                  description="Automatically find order confirmations in your inbox"
                  value={preferences.autoDetectOrders}
                  onChange={(val) => setPreferences({ ...preferences, autoDetectOrders: val })}
                />
                <ToggleRow
                  label="Show delivery address details"
                  description="Display full addresses (masked by default for privacy)"
                  value={preferences.showDeliveryAddress}
                  onChange={(val) => setPreferences({ ...preferences, showDeliveryAddress: val })}
                />
                <ToggleRow
                  label="Return deadline reminders"
                  description="Get notified before return windows close"
                  value={preferences.returnDeadlineReminders}
                  onChange={(val) => setPreferences({ ...preferences, returnDeadlineReminders: val })}
                />
                <ToggleRow
                  label="Auto-link tracking numbers to orders"
                  description="Automatically match tracking info to your orders"
                  value={preferences.autoLinkTracking}
                  onChange={(val) => setPreferences({ ...preferences, autoLinkTracking: val })}
                />
              </div>

              <div className="bg-white rounded-2xl border border-border p-5 mb-8">
                <label className="text-[0.85rem] text-muted-foreground mb-2 block">Default currency</label>
                <select
                  value={preferences.defaultCurrency}
                  onChange={(e) => setPreferences({ ...preferences, defaultCurrency: e.target.value })}
                  className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none cursor-pointer"
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="h-11 px-4 rounded-xl border border-border text-[0.9rem] text-muted-foreground flex items-center gap-2 hover:bg-accent cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setCurrentStep(3)}
                  className="h-11 px-6 rounded-xl bg-cobalt text-white text-[0.9rem] flex items-center gap-2 hover:bg-cobalt-dark transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-3xl bg-cobalt-light flex items-center justify-center mx-auto mb-6">
                <Sparkles size={36} className="text-cobalt" />
              </div>
              <h1 className="text-foreground mb-3">You're all set!</h1>
              <p className="text-[0.95rem] text-muted-foreground mb-2 max-w-md mx-auto">
                Unify is already scanning your connected accounts. We'll notify you as orders, shipments, and returns are detected.
              </p>
              {connected.length > 0 && (
                <p className="text-[0.88rem] text-cobalt mb-6" style={{ fontWeight: 500 }}>
                  {connected.length} account{connected.length > 1 ? 's' : ''} connected
                </p>
              )}
              <button
                onClick={handleFinish}
                className="h-12 px-8 rounded-xl bg-cobalt text-white text-[0.95rem] flex items-center gap-2 hover:bg-cobalt-dark transition-colors cursor-pointer mx-auto"
                style={{ fontWeight: 500 }}
              >
                Take me to Home <ArrowRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }: { label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start justify-between py-3.5">
      <div className="flex-1 pr-4">
        <p className="text-[0.88rem]" style={{ fontWeight: 500 }}>{label}</p>
        <p className="text-[0.78rem] text-muted-foreground mt-0.5">{description}</p>
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
