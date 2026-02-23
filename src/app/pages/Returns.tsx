import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  Clock,
  DollarSign,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useReturns, useAppState } from '../context/AppContext';
import { StatusPill } from '../components/shared/StatusPill';
import { MerchantAvatar } from '../components/shared/MerchantAvatar';
import { EmptyState } from '../components/shared/EmptyState';
import { FilterDialog, FilterOptions } from '../components/shared/FilterDialog';
import { AddReturnModal } from '../components/modals/AddReturnModal';
import { toast } from 'sonner';

export function Returns() {
  const navigate = useNavigate();
  const { returns, updateReturn } = useReturns();
  const { loading } = useAppState();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({});
  const [addReturnOpen, setAddReturnOpen] = useState(false);

  const availableStatuses = useMemo(() => {
    const statuses = new Set(returns.map((r) => r.status));
    return Array.from(statuses);
  }, [returns]);

  const availableMerchants = useMemo(() => {
    const merchants = new Set(returns.map((r) => r.merchant_name));
    return Array.from(merchants);
  }, [returns]);

  const filteredReturns = useMemo(() => {
    return returns.filter((ret) => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          ret.merchant_name.toLowerCase().includes(q) ||
          ret.order_number.toLowerCase().includes(q) ||
          ret.items.some((i) => i.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        if (!filters.status.includes(ret.status)) return false;
      }

      // Merchant filter
      if (filters.merchant && filters.merchant.length > 0) {
        if (!filters.merchant.includes(ret.merchant_name)) return false;
      }

      // Date range filter
      if (filters.dateRange?.start || filters.dateRange?.end) {
        const returnDate = ret.deadline_return ? new Date(ret.deadline_return) : null;
        if (filters.dateRange.start && returnDate && returnDate < new Date(filters.dateRange.start)) {
          return false;
        }
        if (filters.dateRange.end && returnDate && returnDate > new Date(filters.dateRange.end)) {
          return false;
        }
      }

      return true;
    });
  }, [returns, searchQuery, filters]);

  const handleGetLabel = (returnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would download the actual label
    toast.success('Return label downloaded');
  };

  const handleStartReturn = (returnId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    updateReturn(returnId, { status: 'Requested' });
    toast.success('Return request started');
  };

  const handleExternalLink = (merchantName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // In a real app, this would open the merchant's return page
    toast.info(`Opening ${merchantName} return page`);
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
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-foreground">Returns</h2>
          <p className="text-[0.85rem] text-muted-foreground">{returns.length} returns tracked</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-white border border-border flex-1 max-w-[320px]">
          <Search size={15} className="text-muted-foreground" strokeWidth={1.8} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search returns…"
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

      {/* Returns list */}
      {filteredReturns.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No returns yet"
          description="Start a return from any of your orders. We'll track it end to end."
          actionLabel="Start a return from an order"
          onAction={() => setAddReturnOpen(true)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {filteredReturns.map((ret) => (
            <div
              key={ret.return_id}
              className="flex items-center gap-3 lg:gap-4 px-5 py-4 hover:bg-accent/30 transition-colors cursor-pointer group"
              onClick={() => navigate(`/returns/${ret.return_id}`)}
            >
              <MerchantAvatar name={ret.merchant_name} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[0.88rem] truncate" style={{ fontWeight: 500 }}>{ret.merchant_name}</span>
                  <StatusPill status={ret.status} />
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[0.78rem] text-muted-foreground">Order {ret.order_number}</span>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-[0.78rem] text-muted-foreground truncate">{ret.items[0]}</span>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-3 flex-shrink-0">
                {ret.deadline_return && (
                  <span className="text-[0.72rem] px-2 py-0.5 rounded-full bg-warning-light text-warning flex items-center gap-1 whitespace-nowrap" style={{ fontWeight: 500 }}>
                    <Clock size={10} /> Due {new Date(ret.deadline_return).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}
                {ret.refund_amount && (
                  <span className="text-[0.85rem] flex items-center gap-1" style={{ fontWeight: 500 }}>
                    <DollarSign size={13} className="text-success" />{ret.refund_amount.toFixed(2)}
                  </span>
                )}
              </div>
              {/* Quick actions */}
              <div className="hidden lg:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                {ret.status === 'Label created' && (
                  <button
                    onClick={(e) => handleGetLabel(ret.return_id, e)}
                    className="h-7 px-2.5 rounded-lg bg-cobalt-light text-cobalt text-[0.75rem] flex items-center gap-1 cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <Download size={11} /> Get label
                  </button>
                )}
                {ret.status === 'Not started' && (
                  <button
                    onClick={(e) => handleStartReturn(ret.return_id, e)}
                    className="h-7 px-2.5 rounded-lg bg-cobalt-light text-cobalt text-[0.75rem] flex items-center gap-1 cursor-pointer"
                    style={{ fontWeight: 500 }}
                  >
                    <RotateCcw size={11} /> Start
                  </button>
                )}
                <button
                  onClick={(e) => handleExternalLink(ret.merchant_name, e)}
                  className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center cursor-pointer"
                >
                  <ExternalLink size={13} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FilterDialog
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={setFilters}
        currentFilters={filters}
        type="returns"
        availableStatuses={availableStatuses}
        availableMerchants={availableMerchants}
      />
      <AddReturnModal open={addReturnOpen} onClose={() => setAddReturnOpen(false)} />
    </div>
  );
}
