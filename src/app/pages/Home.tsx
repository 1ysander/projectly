import { useNavigate } from 'react-router';
import {
  Truck,
  Package,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useShipments, useReturns, useAppState } from '../context/AppContext';

export function Home() {
  const navigate = useNavigate();
  const { shipments } = useShipments();
  const { returns } = useReturns();
  const { loading } = useAppState();
  const activeShipments = shipments.filter((s) => s.status !== 'Delivered');
  const deliveredShipments = shipments.filter((s) => s.status === 'Delivered');
  const pendingReturns = returns.filter((r) => r.status !== 'Refunded' && r.status !== 'Denied');
  const arrivingToday = shipments.filter((s) => s.status === 'Out for delivery');

  if (loading) {
    return (
      <div className="p-4 lg:p-8 max-w-[1200px] mx-auto flex items-center justify-center min-h-[400px]">
        <Loader2 size={32} className="text-cobalt animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-foreground mb-1">Everything you ordered. One calm place.</h1>
        <p className="text-[0.9rem] text-muted-foreground">Here's what needs your attention today.</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <button
          onClick={() => navigate('/shipments')}
          className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-cobalt-light flex items-center justify-center">
              <Truck size={15} className="text-cobalt" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-[1.5rem] text-foreground" style={{ fontWeight: 700 }}>{activeShipments.length}</p>
          <p className="text-[0.78rem] text-muted-foreground">Active shipments</p>
        </button>

        <button
          onClick={() => navigate('/shipments')}
          className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-success-light flex items-center justify-center">
              <CheckCircle2 size={15} className="text-success" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-[1.5rem] text-foreground" style={{ fontWeight: 700 }}>{arrivingToday.length}</p>
          <p className="text-[0.78rem] text-muted-foreground">Arriving today</p>
        </button>

        <button
          onClick={() => navigate('/returns')}
          className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-warning-light flex items-center justify-center">
              <RotateCcw size={15} className="text-warning" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-[1.5rem] text-foreground" style={{ fontWeight: 700 }}>{pendingReturns.length}</p>
          <p className="text-[0.78rem] text-muted-foreground">Pending returns</p>
        </button>

        <button
          onClick={() => navigate('/shipments')}
          className="bg-white rounded-2xl border border-border p-4 hover:shadow-md transition-shadow cursor-pointer text-left"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
              <Package size={15} className="text-muted-foreground" strokeWidth={1.8} />
            </div>
          </div>
          <p className="text-[1.5rem] text-foreground" style={{ fontWeight: 700 }}>{deliveredShipments.length}</p>
          <p className="text-[0.78rem] text-muted-foreground">Delivered</p>
        </button>
      </div>

    </div>
  );
}
