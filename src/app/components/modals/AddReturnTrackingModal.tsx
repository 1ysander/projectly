import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useShipments } from '../../context/AppContext';
import type { Shipment } from '../../data/mock-data';

interface AddReturnTrackingModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddReturnTrackingModal({ open, onClose }: AddReturnTrackingModalProps) {
  const { addShipment } = useShipments();
  const [carrier, setCarrier] = useState('UPS');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [itemName, setItemName] = useState('');
  const [loading, setLoading] = useState(false);

  const carriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Amazon', 'Other'];

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!trackingNumber.trim()) {
      toast.error('Please enter the return tracking number');
      return;
    }

    setLoading(true);
    try {
      const shipment: Omit<Shipment, 'shipment_id'> = {
        carrier,
        tracking_number: trackingNumber.trim(),
        linked_order_id: undefined,
        item_name: itemName.trim() || undefined,
        merchant_name: merchantName.trim() || undefined,
        status: 'Label created',
        last_scan: 'Return label added',
        eta: undefined,
        delivery_city: undefined,
        delivery_state: undefined,
        return_tracking_number: undefined,
        return_to_city: undefined,
        return_to_state: undefined,
        tracking_events: [],
        progress: 10,
      };

      await addShipment(shipment);
      toast.success('Return label added');
      setTrackingNumber('');
      setMerchantName('');
      setItemName('');
      setCarrier('UPS');
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
            <RotateCcw size={18} /> Track a return label
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Carrier</label>
            <select
              value={carrier}
              onChange={(event) => setCarrier(event.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt cursor-pointer"
            >
              {carriers.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">
              Return tracking number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
              placeholder="Enter the tracking number on your return label"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">
              Merchant (optional)
            </label>
            <input
              type="text"
              value={merchantName}
              onChange={(event) => setMerchantName(event.target.value)}
              placeholder="Amazon, UPS Store, Target…"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">
              Item (optional)
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Running shoes, headphones…"
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
              {loading ? 'Adding…' : 'Add return label'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

