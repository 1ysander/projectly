import { useState } from 'react';
import { X, Filter } from 'lucide-react';

export interface FilterOptions {
  status?: string[];
  merchant?: string[];
  dateRange?: {
    start?: string;
    end?: string;
  };
  search?: string;
}

interface FilterDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
  currentFilters?: FilterOptions;
  type: 'returns' | 'shipments';
  availableStatuses: string[];
  availableMerchants: string[];
}

export function FilterDialog({
  open,
  onClose,
  onApply,
  currentFilters = {},
  type,
  availableStatuses,
  availableMerchants,
}: FilterDialogProps) {
  const [filters, setFilters] = useState<FilterOptions>(currentFilters);

  if (!open) return null;

  const handleStatusToggle = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status?.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...(prev.status || []), status],
    }));
  };

  const handleMerchantToggle = (merchant: string) => {
    setFilters((prev) => ({
      ...prev,
      merchant: prev.merchant?.includes(merchant)
        ? prev.merchant.filter((m) => m !== merchant)
        : [...(prev.merchant || []), merchant],
    }));
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleClear = () => {
    const cleared = {};
    setFilters(cleared);
    onApply(cleared);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
      <div className="fixed top-[10%] left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden mx-4">
        <div className="flex items-center justify-between px-5 h-14 border-b border-border">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-cobalt" />
            <span style={{ fontWeight: 600 }}>Filter {type === 'returns' ? 'Returns' : 'Shipments'}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-accent flex items-center justify-center cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-6">
          {/* Status filter */}
          <div>
            <p className="text-[0.85rem] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>
              Status
            </p>
            <div className="space-y-2">
              {availableStatuses.map((status) => (
                <label
                  key={status}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-border cursor-pointer hover:bg-accent/30"
                >
                  <input
                    type="checkbox"
                    checked={filters.status?.includes(status) || false}
                    onChange={() => handleStatusToggle(status)}
                    className="w-4 h-4 rounded accent-cobalt cursor-pointer"
                  />
                  <span className="text-[0.85rem]">{status}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Merchant filter */}
          {availableMerchants.length > 0 && (
            <div>
              <p className="text-[0.85rem] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>
                Merchant
              </p>
              <div className="space-y-2">
                {availableMerchants.map((merchant) => (
                  <label
                    key={merchant}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border cursor-pointer hover:bg-accent/30"
                  >
                    <input
                      type="checkbox"
                      checked={filters.merchant?.includes(merchant) || false}
                      onChange={() => handleMerchantToggle(merchant)}
                      className="w-4 h-4 rounded accent-cobalt cursor-pointer"
                    />
                    <span className="text-[0.85rem]">{merchant}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div>
            <p className="text-[0.85rem] text-muted-foreground mb-3" style={{ fontWeight: 500 }}>
              Date Range
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[0.75rem] text-muted-foreground mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={filters.dateRange?.start || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, start: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-border text-[0.85rem] outline-none focus:border-cobalt"
                />
              </div>
              <div>
                <label className="text-[0.75rem] text-muted-foreground mb-1 block">End Date</label>
                <input
                  type="date"
                  value={filters.dateRange?.end || ''}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: { ...prev.dateRange, end: e.target.value },
                    }))
                  }
                  className="w-full h-9 px-3 rounded-xl border border-border text-[0.85rem] outline-none focus:border-cobalt"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center gap-3">
          <button
            onClick={handleClear}
            className="h-9 px-4 rounded-xl border border-border text-[0.85rem] text-muted-foreground hover:bg-accent cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            Clear all
          </button>
          <button
            onClick={handleApply}
            className="h-9 px-6 rounded-xl bg-cobalt text-white text-[0.85rem] hover:bg-cobalt-dark cursor-pointer flex-1"
            style={{ fontWeight: 500 }}
          >
            Apply filters
          </button>
        </div>
      </div>
    </>
  );
}
