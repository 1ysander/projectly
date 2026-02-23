import { useState } from 'react';
import {
  Truck,
  Upload,
  Mail,
  RotateCcw,
  X,
} from 'lucide-react';
import { AddTrackingModal } from '../modals/AddTrackingModal';
import { AddReturnModal } from '../modals/AddReturnModal';
import { FileUpload } from '../shared/FileUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner';

interface AddMenuProps {
  open: boolean;
  onClose: () => void;
}

export function AddMenu({ open, onClose }: AddMenuProps) {
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);

  if (!open && !trackingModalOpen && !returnModalOpen && !uploadModalOpen && !emailModalOpen) {
    return null;
  }

  const items = [
    { icon: Truck, label: 'Add tracking number', desc: 'Paste a tracking number from any carrier', action: () => setTrackingModalOpen(true) },
    { icon: Upload, label: 'Upload receipt / invoice', desc: 'PDF, image, or CSV file', action: () => setUploadModalOpen(true) },
    { icon: Mail, label: 'Forward email instructions', desc: 'Send receipts to receipts@unify.app', action: () => setEmailModalOpen(true) },
    {
      icon: RotateCcw,
      label: 'Create return',
      desc: 'Track a return manually',
      action: () => setReturnModalOpen(true),
    },
  ];

  return (
    <>
      {open && (
        <>
          <div className="fixed inset-0 bg-black/30 z-50" onClick={onClose} />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white rounded-2xl shadow-2xl z-50 overflow-hidden mx-4">
            <div className="flex items-center justify-between px-5 h-14 border-b border-border">
              <span style={{ fontWeight: 600 }}>Add to Unify</span>
              <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent cursor-pointer">
                <X size={14} />
              </button>
            </div>
            <div className="py-2">
              {items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-accent/70 cursor-pointer text-left transition-colors"
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                >
                  <div className="w-10 h-10 rounded-xl bg-cobalt-light flex items-center justify-center flex-shrink-0">
                    <item.icon size={18} className="text-cobalt" strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[0.9rem]" style={{ fontWeight: 500 }}>{item.label}</p>
                    <p className="text-[0.78rem] text-muted-foreground">{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <AddTrackingModal open={trackingModalOpen} onClose={() => setTrackingModalOpen(false)} />
      <AddReturnModal open={returnModalOpen} onClose={() => setReturnModalOpen(false)} />

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Receipt / Invoice</DialogTitle>
          </DialogHeader>
          <FileUpload
            onUpload={(files) => {
              toast.success(`${files.length} file(s) uploaded successfully`);
              setUploadModalOpen(false);
            }}
            multiple
          />
        </DialogContent>
      </Dialog>

      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Forward Email Instructions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-[0.85rem] text-muted-foreground">
              Forward your receipt emails to:
            </p>
            <div className="p-3 bg-cobalt-light rounded-xl">
              <p className="text-[0.9rem] font-mono text-cobalt-dark" style={{ fontWeight: 500 }}>
                receipts@unify.app
              </p>
            </div>
            <p className="text-[0.85rem] text-muted-foreground">
              We'll automatically detect and add orders from forwarded emails.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
