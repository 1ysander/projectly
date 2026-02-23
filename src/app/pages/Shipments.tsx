import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  Bell,
  Clock,
  Copy,
  ExternalLink,
  Filter,
  Loader2,
  MapPin,
  Search,
} from 'lucide-react';
import { type Shipment } from '../data/mock-data';
import { useAppState, useNotifications, useShipments } from '../context/AppContext';
import { StatusPill } from '../components/shared/StatusPill';
import { MerchantAvatar } from '../components/shared/MerchantAvatar';
import { FilterDialog, FilterOptions } from '../components/shared/FilterDialog';
import { useClipboard } from '../hooks/useClipboard';
import { toast } from 'sonner';

export function Shipments() {
  const navigate = useNavigate();
  const { shipments } = useShipments();
  const { addNotification } = useNotifications();
  const { loading } = useAppState();
  const { copy } = useClipboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});

  const availableStatuses = useMemo(() => {
    const statuses = new Set(shipments.map((shipment) => shipment.status));
    return Array.from(statuses);
  }, [shipments]);

  const availableMerchants = useMemo(() => {
    const merchants = shipments
      .map((shipment) => shipment.merchant_name)
      .filter((merchant): merchant is string => !!merchant);
    return Array.from(new Set(merchants));
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    return shipments.filter((shipment) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          shipment.carrier.toLowerCase().includes(query) ||
          shipment.tracking_number.toLowerCase().includes(query) ||
          (shipment.item_name && shipment.item_name.toLowerCase().includes(query)) ||
          (shipment.merchant_name && shipment.merchant_name.toLowerCase().includes(query));

        if (!matchesSearch) return false;
      }

      if (filters.status && filters.status.length > 0 && !filters.status.includes(shipment.status)) {
        return false;
      }

      if (
        filters.merchant &&
        filters.merchant.length > 0 &&
        (!shipment.merchant_name || !filters.merchant.includes(shipment.merchant_name))
      ) {
        return false;
      }

      return true;
    });
  }, [filters, searchQuery, shipments]);

  const activeCount = filteredShipments.filter((shipment) => shipment.status !== 'Delivered').length;
  const deliveredCount = filteredShipments.filter((shipment) => shipment.status === 'Delivered').length;

  const handleCopyTracking = (trackingNumber: string, event: React.MouseEvent) => {
    event.stopPropagation();
    copy(trackingNumber, 'Tracking number copied');
  };

  const handleSetDeliveryAlert = (shipment: Shipment, event: React.MouseEvent) => {
    event.stopPropagation();
    addNotification({
      id: `alert_${Date.now()}`,
      title: `Delivery alert set for ${shipment.carrier} ${shipment.tracking_number.slice(-4)}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      action: 'View',
      read: false,
    });
    toast.success('Delivery alert set');
  };

  const handleCarrierTracking = (event: React.MouseEvent) => {
    event.stopPropagation();
    toast.info('Opening carrier tracking page');
  };

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="text-cobalt animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-foreground">Shipments</h2>
          <p className="text-[0.85rem] text-muted-foreground">
            {activeCount} active · {deliveredCount} delivered
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-border flex-1 max-w-[360px]">
          <Search size={15} className="text-muted-foreground" strokeWidth={1.8} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by carrier, tracking, item name..."
            className="flex-1 bg-transparent text-[0.85rem] outline-none placeholder:text-muted-foreground/60"
          />
        </div>
        <button
          onClick={() => setFilterOpen(true)}
          className="h-10 px-3.5 rounded-xl bg-white border border-border text-[0.85rem] text-muted-foreground flex items-center gap-1.5 hover:bg-accent cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          <Filter size={14} strokeWidth={1.8} /> Filter
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {filteredShipments.map((shipment) => {
          const itemTitle = shipment.item_name || shipment.merchant_name || shipment.carrier;
          const returningToSender = shipment.status.toLowerCase().includes('return');

          return (
            <div
              key={shipment.shipment_id}
              onClick={() => navigate(`/shipments/${shipment.shipment_id}`)}
              className="px-5 py-4 hover:bg-accent/30 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2.5">
                <MerchantAvatar name={shipment.carrier} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[0.88rem] truncate" style={{ fontWeight: 600 }}>
                      {itemTitle}
                    </span>
                    <StatusPill status={shipment.status} />
                    {returningToSender && (
                      <span
                        className="text-[0.7rem] px-1.5 py-0.5 rounded bg-warning-light text-warning flex items-center gap-1"
                        style={{ fontWeight: 500 }}
                      >
                        <AlertCircle size={10} /> Returning
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[0.78rem] text-muted-foreground">{shipment.carrier}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[0.78rem] text-muted-foreground font-mono">
                      {shipment.tracking_number}
                    </span>
                    <button
                      onClick={(event) => handleCopyTracking(shipment.tracking_number, event)}
                      className="cursor-pointer hover:text-cobalt"
                    >
                      <Copy size={11} className="text-muted-foreground/50" />
                    </button>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {shipment.eta && shipment.status !== 'Delivered' && (
                    <p className="text-[0.72rem] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                      <Clock size={10} /> ETA{' '}
                      {new Date(shipment.eta).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-1.5">
                <div
                  className={`h-full rounded-full transition-all ${
                    shipment.status === 'Delivered' ? 'bg-success' : 'bg-cobalt'
                  }`}
                  style={{ width: `${shipment.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[0.75rem] text-muted-foreground truncate">{shipment.last_scan}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {shipment.delivery_city && (
                    <span className="text-[0.75rem] text-muted-foreground flex items-center gap-1">
                      <MapPin size={10} /> {shipment.delivery_city}
                      {shipment.delivery_state ? `, ${shipment.delivery_state}` : ''}
                    </span>
                  )}
                  <button
                    onClick={(event) => handleSetDeliveryAlert(shipment, event)}
                    className="h-7 px-2 rounded-lg border border-border text-[0.72rem] text-muted-foreground hover:bg-accent cursor-pointer flex items-center gap-1"
                    style={{ fontWeight: 500 }}
                  >
                    <Bell size={11} /> Alert
                  </button>
                  <button
                    onClick={handleCarrierTracking}
                    className="h-7 px-2 rounded-lg border border-border text-[0.72rem] text-muted-foreground hover:bg-accent cursor-pointer flex items-center gap-1"
                    style={{ fontWeight: 500 }}
                  >
                    <ExternalLink size={11} /> Track
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        currentFilters={filters}
        type="shipments"
        availableStatuses={availableStatuses}
        availableMerchants={availableMerchants}
      />
    </div>
  );
}
