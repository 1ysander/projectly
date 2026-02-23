import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Truck,
  RotateCcw,
  Plus,
  Link,
  Upload,
  X,
} from 'lucide-react';
import { useShipments, useReturns } from '../../context/AppContext';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { shipments } = useShipments();
  const { returns } = useReturns();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (!open) {
          // Parent handles opening
        } else {
          onClose();
        }
      }
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.toLowerCase();
  const filteredShipments = shipments.filter(
    (s) =>
      s.carrier.toLowerCase().includes(q) ||
      s.tracking_number.includes(q) ||
      (s.merchant_name && s.merchant_name.toLowerCase().includes(q))
  );
  const filteredReturns = returns.filter(
    (r) => r.merchant_name.toLowerCase().includes(q) || r.order_number.toLowerCase().includes(q)
  );

  const quickActions = [
    { icon: Truck, label: 'Add tracking number', action: () => navigate('/shipments') },
    { icon: Upload, label: 'Upload receipt/invoice', action: () => navigate('/connections') },
    { icon: RotateCcw, label: 'Start a return', action: () => navigate('/returns') },
    { icon: Link, label: 'Connect account', action: () => navigate('/connections') },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-[560px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden mx-4">
        {/* Search input */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-border">
          <Search size={18} className="text-muted-foreground" strokeWidth={1.8} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shipments, tracking, returns…"
            className="flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-muted-foreground/60"
          />
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground cursor-pointer">
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {!query && (
            <div className="py-2">
              <div className="px-5 py-2">
                <span className="text-[0.7rem] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>Quick actions</span>
              </div>
              {quickActions.map((action) => (
                <button
                  key={action.label}
                  onClick={() => {
                    action.action();
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/70 cursor-pointer text-left"
                >
                  <action.icon size={16} className="text-muted-foreground" strokeWidth={1.8} />
                  <span className="text-[0.85rem]">{action.label}</span>
                </button>
              ))}
            </div>
          )}

          {query && filteredShipments.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-2">
                <span className="text-[0.7rem] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>Shipments</span>
              </div>
              {filteredShipments.slice(0, 4).map((shipment) => (
                <button
                  key={shipment.shipment_id}
                  onClick={() => {
                    navigate(`/shipments/${shipment.shipment_id}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/70 cursor-pointer text-left"
                >
                  <Truck size={16} className="text-muted-foreground" strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.85rem] truncate">
                      {shipment.item_name || shipment.merchant_name || shipment.carrier} — {shipment.status}
                    </p>
                    <p className="text-[0.75rem] text-muted-foreground font-mono">{shipment.tracking_number}</p>
                  </div>
                  <span className="text-[0.8rem] text-muted-foreground">Open</span>
                </button>
              ))}
            </div>
          )}

          {query && filteredReturns.length > 0 && (
            <div className="py-2">
              <div className="px-5 py-2">
                <span className="text-[0.7rem] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>Returns</span>
              </div>
              {filteredReturns.slice(0, 3).map((ret) => (
                <button
                  key={ret.return_id}
                  onClick={() => {
                    navigate(`/returns/${ret.return_id}`);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-5 py-2.5 hover:bg-accent/70 cursor-pointer text-left"
                >
                  <RotateCcw size={16} className="text-muted-foreground" strokeWidth={1.8} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.85rem] truncate">{ret.merchant_name} — {ret.status}</p>
                    <p className="text-[0.75rem] text-muted-foreground">{ret.order_number}</p>
                  </div>
                  <span className="text-[0.8rem] text-muted-foreground">Open</span>
                </button>
              ))}
            </div>
          )}

          {query && filteredShipments.length === 0 && filteredReturns.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-muted-foreground text-[0.9rem]">No results for "{query}"</p>
              <p className="text-muted-foreground/60 text-[0.8rem] mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
