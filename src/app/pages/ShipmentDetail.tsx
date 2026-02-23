import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  MapPin,
  RefreshCw,
  Save,
  Truck,
} from 'lucide-react';
import { useAppState, useShipments } from '../context/AppContext';
import { StatusPill } from '../components/shared/StatusPill';
import { MerchantAvatar } from '../components/shared/MerchantAvatar';
import { useClipboard } from '../hooks/useClipboard';
import { toast } from 'sonner';

const shipmentSteps = ['Label created', 'In transit', 'Out for delivery', 'Delivered'];

function getStepIndex(status: string) {
  const map: Record<string, number> = {
    'Label created': 0,
    'In transit': 1,
    'Out for delivery': 2,
    Delivered: 3,
    'Returning to sender': 1,
    Issue: 1,
  };
  return map[status] ?? 0;
}

function formatEventDate(value?: string) {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ShipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { shipments, updateShipment } = useShipments();
  const { refreshData } = useAppState();
  const { copy } = useClipboard();
  const shipment = shipments.find((item) => item.shipment_id === id);

  const [itemName, setItemName] = useState('');
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!shipment) return;
    setItemName(shipment.item_name || shipment.merchant_name || '');
  }, [shipment]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setSyncing(true);
      try {
        await refreshData();
      } catch {
        // Swallow sync errors in detail screen; UI already has latest cached state.
      } finally {
        if (active) setSyncing(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, refreshData]);

  const events = useMemo(() => {
    const source = Array.isArray(shipment?.tracking_events) ? shipment.tracking_events : [];
    return [...source].sort((a, b) => {
      const aTime = Date.parse(a.datetime || '');
      const bTime = Date.parse(b.datetime || '');
      return bTime - aTime;
    });
  }, [shipment?.tracking_events]);

  if (!shipment) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Shipment not found</p>
        <button
          onClick={() => navigate('/shipments')}
          className="text-cobalt mt-2 cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          Back to Shipments
        </button>
      </div>
    );
  }

  const currentEvent = events[0];
  const pastEvent = events[1];
  const status = shipment.status;
  const returningToSender =
    status.toLowerCase().includes('return') ||
    (shipment.last_scan || '').toLowerCase().includes('return to sender');
  const stepIndex = getStepIndex(status);

  const handleSaveItemName = async () => {
    setSaving(true);
    try {
      await updateShipment(shipment.shipment_id, {
        item_name: itemName.trim() || undefined,
      });
      toast.success('Item name updated');
    } catch {
      toast.error('Failed to update item name');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-[900px] mx-auto">
      <button
        onClick={() => navigate('/shipments')}
        className="flex items-center gap-1.5 text-muted-foreground text-[0.85rem] mb-4 hover:text-foreground cursor-pointer"
        style={{ fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Back to Shipments
      </button>

      <div className="bg-white rounded-2xl border border-border p-5 lg:p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <MerchantAvatar name={shipment.carrier} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-foreground truncate">{itemName || shipment.carrier}</h2>
              <StatusPill status={status} size="md" />
            </div>
            <p className="text-[0.85rem] text-muted-foreground mt-0.5">
              {shipment.carrier} · Tracking {shipment.tracking_number}
            </p>
          </div>
        </div>

        <div className="p-3 bg-cobalt-light/30 rounded-xl border border-cobalt/20 mb-4 flex items-center gap-2">
          <RefreshCw size={15} className={`text-cobalt ${syncing ? 'animate-spin' : ''}`} />
          <span className="text-[0.83rem] text-cobalt-dark" style={{ fontWeight: 500 }}>
            Carrier data updates automatically on app open and hourly. No manual status updates needed.
          </span>
        </div>

        {returningToSender && (
          <div className="p-3 bg-warning-light rounded-xl border border-warning/20 mb-4 flex items-start gap-2">
            <AlertCircle size={16} className="text-warning mt-0.5" />
            <div>
              <p className="text-[0.85rem] text-warning" style={{ fontWeight: 600 }}>
                This shipment is returning to sender.
              </p>
              {shipment.return_tracking_number && (
                <p className="text-[0.8rem] text-warning mt-1">
                  Return tracking number: {shipment.return_tracking_number}
                </p>
              )}
              {(shipment.return_to_city || shipment.return_to_state) && (
                <p className="text-[0.8rem] text-warning mt-1">
                  Return to: {[shipment.return_to_city, shipment.return_to_state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div className="p-3 bg-[#F8F9FA] rounded-xl">
            <p className="text-[0.75rem] text-muted-foreground mb-1">Tracking Number</p>
            <div className="flex items-center gap-2">
              <p className="text-[0.85rem] font-mono flex-1">{shipment.tracking_number}</p>
              <button
                onClick={() => copy(shipment.tracking_number, 'Tracking number copied')}
                className="cursor-pointer hover:text-cobalt"
              >
                <Copy size={13} className="text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="p-3 bg-[#F8F9FA] rounded-xl">
            <p className="text-[0.75rem] text-muted-foreground mb-1">Latest Update</p>
            <p className="text-[0.85rem]">{shipment.last_scan}</p>
          </div>
        </div>

        <div className="text-[0.78rem] text-muted-foreground" style={{ fontWeight: 500 }}>
          Tracking updates are synced automatically from your carrier integrations.
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 lg:p-6 mb-6">
        <h4 className="mb-5">Shipment Progress</h4>
        <div className="flex items-center justify-between relative">
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#E5E7EB]" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-cobalt transition-all"
            style={{ width: `${Math.max(0, (stepIndex / (shipmentSteps.length - 1)) * 100)}%` }}
          />
          {shipmentSteps.map((step, index) => (
            <div key={step} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index <= stepIndex ? 'bg-cobalt' : 'bg-[#E5E7EB]'
                }`}
              >
                <CheckCircle2
                  size={16}
                  className={index <= stepIndex ? 'text-white' : 'text-muted-foreground/40'}
                />
              </div>
              <span
                className={`text-[0.7rem] mt-2 text-center ${
                  index <= stepIndex ? 'text-cobalt' : 'text-muted-foreground/60'
                }`}
                style={{ fontWeight: index <= stepIndex ? 500 : 400 }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-5 lg:p-6">
          <h4 className="mb-4 flex items-center gap-2">
            <Truck size={16} className="text-cobalt" /> Shipment Details
          </h4>
          <div className="space-y-3">
            <div>
              <label className="text-[0.82rem] text-muted-foreground mb-1.5 block">Item Name</label>
              <input
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="Shoes, keyboard, gift, etc."
                className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
              />
            </div>
            <div className="flex justify-between text-[0.85rem]">
              <span className="text-muted-foreground">Status</span>
              <StatusPill status={status} />
            </div>
            {shipment.eta && (
              <div className="flex justify-between text-[0.85rem]">
                <span className="text-muted-foreground">ETA</span>
                <span>{new Date(shipment.eta).toLocaleDateString('en-US')}</span>
              </div>
            )}
            {(shipment.delivery_city || shipment.delivery_state) && (
              <div className="flex justify-between text-[0.85rem]">
                <span className="text-muted-foreground">Destination</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {[shipment.delivery_city, shipment.delivery_state].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
            <button
              onClick={() => void handleSaveItemName()}
              disabled={saving}
              className="h-9 px-4 rounded-xl bg-cobalt text-white text-[0.85rem] hover:bg-cobalt-dark cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              <Save size={14} /> {saving ? 'Saving...' : 'Save Item Name'}
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border p-5 lg:p-6">
          <h4 className="mb-4">Tracking Events</h4>
          {currentEvent ? (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-cobalt-light/20 border border-cobalt/20">
                <p className="text-[0.75rem] text-cobalt mb-1" style={{ fontWeight: 600 }}>
                  Current Event
                </p>
                <p className="text-[0.75rem] text-cobalt/80 mb-1 uppercase">{currentEvent.status}</p>
                <p className="text-[0.86rem]">{currentEvent.message}</p>
                {(currentEvent.city || currentEvent.state) && (
                  <p className="text-[0.75rem] text-muted-foreground mt-1">
                    {[currentEvent.city, currentEvent.state].filter(Boolean).join(', ')}
                  </p>
                )}
                <p className="text-[0.75rem] text-muted-foreground mt-1">
                  {formatEventDate(currentEvent.datetime)}
                </p>
              </div>
              {pastEvent && (
                <div className="p-3 rounded-xl bg-[#F8F9FA] border border-border">
                  <p className="text-[0.75rem] text-muted-foreground mb-1" style={{ fontWeight: 600 }}>
                    Past Event
                  </p>
                  <p className="text-[0.75rem] text-muted-foreground/80 mb-1 uppercase">
                    {pastEvent.status}
                  </p>
                  <p className="text-[0.86rem]">{pastEvent.message}</p>
                  {(pastEvent.city || pastEvent.state) && (
                    <p className="text-[0.75rem] text-muted-foreground mt-1">
                      {[pastEvent.city, pastEvent.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <p className="text-[0.75rem] text-muted-foreground mt-1">
                    {formatEventDate(pastEvent.datetime)}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-[0.85rem] text-muted-foreground">
              Tracking events will appear here once carrier updates are synced.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
