import { useState } from 'react';
import { Link, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';
import { useShipments, useOrders } from '../../context/AppContext';

interface LinkOrderModalProps {
  open: boolean;
  onClose: () => void;
  shipmentId: string;
}

export function LinkOrderModal({ open, onClose, shipmentId }: LinkOrderModalProps) {
  const { linkShipmentToOrder } = useShipments();
  const { orders } = useOrders();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(
    (order) =>
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.merchant_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLink = async (orderId: string) => {
    await linkShipmentToOrder(shipmentId, orderId);
    toast.success('Shipment linked to order');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link size={18} /> Link to Order
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-[#F8F9FA] border border-border">
            <Search size={15} className="text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              className="flex-1 bg-transparent text-[0.85rem] outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2">
            {filteredOrders.length === 0 ? (
              <p className="text-center text-[0.85rem] text-muted-foreground py-8">
                No orders found
              </p>
            ) : (
              filteredOrders.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => handleLink(order.order_id)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-accent/30 cursor-pointer text-left"
                >
                  <div className="flex-1">
                    <p className="text-[0.85rem]" style={{ fontWeight: 500 }}>
                      {order.merchant_name}
                    </p>
                    <p className="text-[0.75rem] text-muted-foreground">Order {order.order_number}</p>
                  </div>
                  <Link size={14} className="text-cobalt" />
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
