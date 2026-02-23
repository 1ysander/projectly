import { useMemo } from 'react';
import {
  ShoppingBag,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  Calendar,
  Loader2,
  Truck,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { useAppState, useOrders, useReturns, useShipments } from '../context/AppContext';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function buildLastSixMonthWindow() {
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      month: date.toLocaleDateString('en-US', { month: 'short' }),
    };
  });
}

export function Analytics() {
  const { orders } = useOrders();
  const { returns } = useReturns();
  const { shipments } = useShipments();
  const { loading } = useAppState();

  const totalSpend = useMemo(
    () => orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    [orders]
  );
  const totalOrders = orders.length;
  const totalReturns = returns.length;
  const pendingReturns = returns.filter((returnItem) => returnItem.status !== 'Refunded' && returnItem.status !== 'Denied').length;
  const refundedReturns = returns.filter((returnItem) => returnItem.status === 'Refunded').length;
  const inTransitShipments = shipments.filter((shipment) => shipment.status !== 'Delivered').length;
  const missingTrackingOrders = orders.filter((order) => !order.shipment_links || order.shipment_links.length === 0).length;
  const returnRate = totalOrders > 0 ? (totalReturns / totalOrders) * 100 : 0;
  const trackingCoverage = totalOrders > 0 ? ((totalOrders - missingTrackingOrders) / totalOrders) * 100 : 0;

  const spendData = useMemo(() => {
    const monthWindow = buildLastSixMonthWindow();
    const totals = new Map(monthWindow.map((entry) => [entry.key, 0]));

    for (const order of orders) {
      const orderDate = new Date(order.order_date);
      if (Number.isNaN(orderDate.getTime())) continue;
      const key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      if (!totals.has(key)) continue;
      totals.set(key, (totals.get(key) || 0) + Number(order.total_amount || 0));
    }

    return monthWindow.map((entry) => ({
      month: entry.month,
      amount: Number((totals.get(entry.key) || 0).toFixed(2)),
    }));
  }, [orders]);

  const merchantData = useMemo(() => {
    const merchantTotals = new Map<string, number>();
    for (const order of orders) {
      const merchantName = order.merchant_name || 'Unknown';
      merchantTotals.set(merchantName, (merchantTotals.get(merchantName) || 0) + Number(order.total_amount || 0));
    }

    return [...merchantTotals.entries()]
      .map(([name, amount]) => ({ name, amount: Number(amount.toFixed(2)) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [orders]);

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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-foreground">Analytics</h2>
          <p className="text-[0.85rem] text-muted-foreground">Overview of your order and return activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-9 px-3.5 rounded-xl bg-white border border-border text-[0.85rem] text-muted-foreground flex items-center gap-1.5 cursor-default" style={{ fontWeight: 500 }}>
            <Calendar size={14} /> Last 6 months
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            icon: DollarSign,
            label: 'Total Spend (6mo)',
            value: formatCurrency(totalSpend),
            detail: `${totalOrders} orders`,
            bg: 'bg-cobalt-light',
            color: 'text-cobalt',
          },
          {
            icon: ShoppingBag,
            label: 'Total Orders',
            value: String(totalOrders),
            detail: `${inTransitShipments} shipments in transit`,
            bg: 'bg-success-light',
            color: 'text-success',
          },
          {
            icon: RotateCcw,
            label: 'Return Rate',
            value: `${Math.round(returnRate)}%`,
            detail: `${totalReturns} return${totalReturns === 1 ? '' : 's'}`,
            bg: 'bg-warning-light',
            color: 'text-warning',
          },
          {
            icon: AlertTriangle,
            label: 'Missing Tracking',
            value: String(missingTrackingOrders),
            detail: `Coverage ${Math.round(trackingCoverage)}%`,
            bg: 'bg-danger-light',
            color: 'text-danger',
          },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-border p-4 min-h-[122px]">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                <card.icon size={15} className={card.color} />
              </div>
              <span className="text-[0.78rem] text-muted-foreground">{card.label}</span>
            </div>
            <p className="text-[1.4rem] text-foreground" style={{ fontWeight: 700 }}>{card.value}</p>
            <p className="text-[0.78rem] mt-1 text-muted-foreground" style={{ fontWeight: 500 }}>
              {card.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend over time */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h4 className="mb-4">Spend Over Time</h4>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spendData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4361EE" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4361EE" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F5" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                  formatter={(value: number) => [formatCurrency(value), 'Spend']}
                />
                <Area type="monotone" dataKey="amount" stroke="#4361EE" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top merchants */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h4 className="mb-4">Top Merchants</h4>
          <div className="h-[250px]">
            {merchantData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center px-6">
                <p className="text-[0.85rem] text-muted-foreground">No merchant spend data yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={merchantData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F1F5" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} width={90} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value: number) => [formatCurrency(value), 'Spend']}
                  />
                  <Bar dataKey="amount" fill="#4361EE" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Return Summary */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h4 className="mb-3">Returns</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA]">
              <span className="text-[0.85rem] text-muted-foreground">Pending returns</span>
              <span className="text-[0.9rem] text-foreground" style={{ fontWeight: 600 }}>{pendingReturns}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA]">
              <span className="text-[0.85rem] text-muted-foreground">Refunded returns</span>
              <span className="text-[0.9rem] text-foreground" style={{ fontWeight: 600 }}>{refundedReturns}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F9FA]">
              <span className="text-[0.85rem] text-muted-foreground">Overall return rate</span>
              <span className="text-[0.9rem] text-foreground" style={{ fontWeight: 600 }}>{Math.round(returnRate)}%</span>
            </div>
          </div>
        </div>

        {/* Tracking Coverage */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h4 className="mb-3">Shipment Coverage</h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[0.9rem] text-foreground flex items-center gap-2" style={{ fontWeight: 500 }}>
                <Truck size={14} className="text-cobalt" />
                Orders with tracking
              </p>
              <p className="text-[0.9rem] text-foreground" style={{ fontWeight: 700 }}>
                {totalOrders - missingTrackingOrders}/{totalOrders}
              </p>
            </div>
            <div className="w-full h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
              <div
                className="h-full bg-cobalt"
                style={{ width: `${Math.max(0, Math.min(100, trackingCoverage))}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[#F8F9FA]">
                <p className="text-[0.75rem] text-muted-foreground">In transit</p>
                <p className="text-[0.95rem] text-foreground mt-0.5" style={{ fontWeight: 600 }}>{inTransitShipments}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#F8F9FA]">
                <p className="text-[0.75rem] text-muted-foreground">Missing tracking</p>
                <p className="text-[0.95rem] text-foreground mt-0.5" style={{ fontWeight: 600 }}>{missingTrackingOrders}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
