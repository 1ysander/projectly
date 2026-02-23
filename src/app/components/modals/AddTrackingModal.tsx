import { useState } from 'react';
import { Truck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useShipments } from '../../context/AppContext';
import { Shipment } from '../../data/mock-data';

interface AddTrackingModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTrackingModal({ open, onClose }: AddTrackingModalProps) {
  const { addShipment } = useShipments();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('UPS');
  const [itemName, setItemName] = useState('');
  const [loading, setLoading] = useState(false);

  const carriers = ['UPS', 'FedEx', 'USPS', 'DHL', 'Other'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) {
      toast.error('Please enter a tracking number');
      return;
    }

    setLoading(true);
    
    const newShipment: Omit<Shipment, 'shipment_id'> = {
      carrier,
      tracking_number: trackingNumber.trim(),
      item_name: itemName.trim() || undefined,
      status: 'In transit',
      last_scan: 'Tracking number added',
      progress: 20,
    };
    
    await addShipment(newShipment);
    setTrackingNumber('');
    setCarrier('UPS');
    setItemName('');
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck size={18} /> Add Tracking Number
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Carrier</label>
            <select
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt cursor-pointer"
            >
              {carriers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Tracking Number</label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="w-full h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt"
            />
          </div>
          <div>
            <label className="text-[0.85rem] text-muted-foreground mb-1.5 block">Item Name (optional)</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Running shoes"
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
              {loading ? 'Adding...' : 'Add Tracking'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
