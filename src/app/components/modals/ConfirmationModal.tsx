import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
}

export function ConfirmationModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {variant === 'danger' && <AlertTriangle size={18} className="text-danger" />}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-3 pt-4">
          <button
            onClick={onClose}
            className="h-9 px-4 rounded-xl border border-border text-[0.85rem] text-muted-foreground hover:bg-accent cursor-pointer flex-1"
            style={{ fontWeight: 500 }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            className={`h-9 px-6 rounded-xl text-white text-[0.85rem] hover:opacity-90 cursor-pointer flex-1 ${
              variant === 'danger' ? 'bg-danger' : 'bg-cobalt hover:bg-cobalt-dark'
            }`}
            style={{ fontWeight: 500 }}
          >
            {confirmLabel}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
