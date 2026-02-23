import { QrCode, Download, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  returnId: string;
  trackingNumber?: string;
}

export function QRCodeModal({ open, onClose, returnId, trackingNumber }: QRCodeModalProps) {
  // Generate a simple QR code data URL (in real app, use a QR code library)
  const qrData = trackingNumber || returnId;
  
  // Mock QR code - in production, use a library like qrcode.react
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}`;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `return-qr-${returnId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Return QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="w-48 h-48 bg-white p-4 rounded-xl border border-border flex items-center justify-center">
            <img src={qrCodeUrl} alt="QR Code" className="w-full h-full" />
          </div>
          <p className="text-[0.85rem] text-muted-foreground text-center">
            Show this QR code at the drop-off location
          </p>
          <button
            onClick={handleDownload}
            className="h-9 px-4 rounded-xl bg-cobalt text-white text-[0.85rem] flex items-center gap-2 hover:bg-cobalt-dark cursor-pointer"
            style={{ fontWeight: 500 }}
          >
            <Download size={14} /> Download QR Code
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
