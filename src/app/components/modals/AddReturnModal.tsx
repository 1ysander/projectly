import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useReturns } from '../../context/AppContext';
import { UnifiedReturn } from '../../data/mock-data';

interface AddReturnModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddReturnModal({ open, onClose }: AddReturnModalProps) {
  const { addReturn } = useReturns();
  const [merchantName, setMerchantName] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [method, setMethod] = useState<UnifiedReturn['method']>('mail');
  const [deadlineReturn, setDeadlineReturn] = useState('');
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setMerchantName('');
    setOrderNumber('');
    setItemName('');
    setMethod('mail');
    setDeadlineReturn('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!merchantName.trim()) {
      toast.error('Please enter the merchant name');
      return;
    }
    if (!orderNumber.trim()) {
      toast.error('Please enter the order number');
      return;
    }
    if (!itemName.trim()) {
      toast.error('Please enter at least one return item');
      return;
    }

    setLoading(true);
    try {
      await addReturn({
        related_order_id: '',
        merchant_name: merchantName.trim(),
        status: 'Not started',
        method,
        order_number: orderNumber.trim(),
        items: [itemName.trim()],
        deadline_return: deadlineReturn || undefined,
      });
      toast.success('Return added');
      resetForm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw size={18} /> Add Return
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Merchant</label>
            <input
              type="text"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="Amazon"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Order Number</label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="112-1234567-1234567"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Item</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Wireless Mouse"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Return Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as UnifiedReturn['method'])}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt cursor-pointer"
            >
              <option value="mail">Mail</option>
              <option value="pickup">Pickup</option>
              <option value="in-store">In-store</option>
            </select>
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Return Deadline (optional)</label>
            <input
              type="date"
              value={deadlineReturn}
              onChange={(e) => setDeadlineReturn(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-border text-[0.85rem] text-muted-foreground hover:bg-accent cursor-pointer flex-1"
              style={{ fontWeight: 500 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-9 px-6 rounded-xl bg-cobalt text-white text-[0.85rem] hover:bg-cobalt-dark cursor-pointer flex-1 disabled:opacity-50"
              style={{ fontWeight: 500 }}
            >
              {loading ? 'Adding...' : 'Add Return'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
