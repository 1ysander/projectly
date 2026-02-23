import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Download,
  QrCode,
  Printer,
  MapPin,
  Truck,
  MessageSquare,
  Clock,
  DollarSign,
  CheckCircle2,
  Circle,
  AlertCircle,
  Bell,
} from 'lucide-react';
import { useReturns, useNotifications } from '../context/AppContext';
import { StatusPill } from '../components/shared/StatusPill';
import { MerchantAvatar } from '../components/shared/MerchantAvatar';
import { QRCodeModal } from '../components/modals/QRCodeModal';
import { toast } from 'sonner';

const returnSteps = ['Request', 'Label', 'Drop-off', 'In transit', 'Received', 'Refunded'];

export function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { returns, updateReturn } = useReturns();
  const { addNotification } = useNotifications();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [editingItems, setEditingItems] = useState(false);
  const [itemsDraft, setItemsDraft] = useState('');

  const ret = returns.find((r) => r.return_id === id);

  useEffect(() => {
    if (!ret) return;
    setItemsDraft((ret.items || []).join('\n'));
  }, [ret]);

  if (!ret) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Return not found</p>
        <button onClick={() => navigate('/returns')} className="text-cobalt mt-2 cursor-pointer" style={{ fontWeight: 500 }}>
          Back to Returns
        </button>
      </div>
    );
  }

  const stepIndex = (() => {
    const map: Record<string, number> = {
      'Not started': -1, 'Requested': 0, 'Label created': 1, 'Dropped off': 2,
      'In transit': 3, 'Received': 4, 'Refund pending': 5, 'Refunded': 5, 'Denied': -2,
    };
    return map[ret.status] ?? -1;
  })();

  const actionsByStatus: Record<string, { label: string; icon: typeof Download }[]> = {
    'Not started': [{ label: 'Request return', icon: MessageSquare }],
    'Requested': [{ label: 'Generate label', icon: Download }, { label: 'Show QR code', icon: QrCode }],
    'Label created': [{ label: 'Download label', icon: Download }, { label: 'Find drop-off', icon: MapPin }],
    'Dropped off': [{ label: 'Track return shipment', icon: Truck }],
    'In transit': [{ label: 'Track return shipment', icon: Truck }],
    'Received': [{ label: 'View refund status', icon: DollarSign }],
    'Refund pending': [{ label: 'Ping merchant', icon: MessageSquare }],
    'Refunded': [],
    'Denied': [{ label: 'Appeal / Contact support', icon: MessageSquare }],
  };

  const actions = actionsByStatus[ret.status] || [];

  const handleAction = (actionLabel: string) => {
    switch (actionLabel) {
      case 'Request return':
        updateReturn(ret.return_id, { status: 'Requested' });
        toast.success('Return request submitted');
        break;
      case 'Generate label':
        updateReturn(ret.return_id, { status: 'Label created' });
        toast.success('Return label generated');
        break;
      case 'Show QR code':
        setQrModalOpen(true);
        break;
      case 'Download label':
        // Mock download
        toast.success('Return label downloaded');
        break;
      case 'Find drop-off':
        toast.info('Opening drop-off location finder');
        break;
      case 'Track return shipment':
        toast.info('Tracking return shipment');
        break;
      case 'View refund status':
        toast.info('Viewing refund status');
        break;
      case 'Ping merchant':
        toast.info('Contacting merchant about refund');
        break;
      case 'Appeal / Contact support':
        toast.info('Opening support contact form');
        break;
    }
  };

  const handleDownloadLabel = () => {
    toast.success('Return label downloaded');
  };

  const handleShowQR = () => {
    setQrModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Print dialog opened');
  };

  const handleRemindMe = () => {
    addNotification({
      id: `reminder_${Date.now()}`,
      title: `Return deadline reminder: ${ret.merchant_name}`,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      action: 'View',
      read: false,
    });
    toast.success('Reminder set');
  };

  const handleSnooze = () => {
    toast.success('Reminder snoozed for 1 day');
  };

  const handleSaveItems = async () => {
    const parsedItems = itemsDraft
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);

    if (parsedItems.length === 0) {
      toast.error('Please add at least one item name');
      return;
    }

    await updateReturn(ret.return_id, {
      items: parsedItems,
    });
    setEditingItems(false);
    toast.success('Item names updated');
  };

  return (
    <div className="p-4 lg:p-8 max-w-[900px] mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate('/returns')}
        className="flex items-center gap-1.5 text-muted-foreground text-[0.85rem] mb-4 hover:text-foreground cursor-pointer"
        style={{ fontWeight: 500 }}
      >
        <ArrowLeft size={16} /> Back to Returns
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-border p-5 lg:p-6 mb-6">
        <div className="flex items-start gap-4 mb-4">
          <MerchantAvatar name={ret.merchant_name} size={48} />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-foreground">{ret.merchant_name}</h2>
              <StatusPill status={ret.status} size="md" />
            </div>
            <p className="text-[0.85rem] text-muted-foreground mt-0.5">
              Return {ret.return_id} · Order {ret.order_number}
            </p>
          </div>
        </div>

        {/* Deadline banner */}
        {ret.deadline_return && ret.status !== 'Refunded' && ret.status !== 'Denied' && (
          <div className="flex items-center justify-between p-3 bg-warning-light rounded-xl mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-warning" />
              <span className="text-[0.85rem] text-warning" style={{ fontWeight: 500 }}>
                Return window ends {new Date(ret.deadline_return).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRemindMe}
                className="h-7 px-2.5 rounded-lg text-[0.75rem] text-warning border border-warning/30 cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <Bell size={11} className="inline mr-1" />Remind me
              </button>
              <button
                onClick={handleSnooze}
                className="h-7 px-2.5 rounded-lg text-[0.75rem] text-warning/70 cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                Snooze
              </button>
            </div>
          </div>
        )}

        {/* Denied banner */}
        {ret.status === 'Denied' && (
          <div className="p-3 bg-danger-light rounded-xl mb-4 border border-danger/20">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-danger" />
              <span className="text-[0.85rem] text-danger" style={{ fontWeight: 500 }}>
                Return denied — Merchant stated item is not eligible for return.
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={() => handleAction(action.label)}
              className="h-9 px-4 rounded-xl bg-cobalt text-white text-[0.85rem] flex items-center gap-1.5 hover:bg-cobalt-dark transition-colors cursor-pointer"
              style={{ fontWeight: 500 }}
            >
              <action.icon size={14} /> {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white rounded-2xl border border-border p-5 lg:p-6 mb-6">
        <h4 className="mb-5">Return Progress</h4>
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-[#E5E7EB]" />
          <div
            className="absolute top-4 left-0 h-0.5 bg-cobalt transition-all"
            style={{ width: `${Math.max(0, (stepIndex / (returnSteps.length - 1)) * 100)}%` }}
          />
          {returnSteps.map((step, i) => (
            <div key={step} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  i <= stepIndex ? 'bg-cobalt' : 'bg-[#E5E7EB]'
                }`}
              >
                {i <= stepIndex ? (
                  <CheckCircle2 size={16} className="text-white" />
                ) : (
                  <Circle size={16} className="text-muted-foreground/40" />
                )}
              </div>
              <span className={`text-[0.7rem] mt-2 text-center ${
                i <= stepIndex ? 'text-cobalt' : 'text-muted-foreground/60'
              }`} style={{ fontWeight: i <= stepIndex ? 500 : 400 }}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Return method */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <h4 className="mb-3 flex items-center gap-2">
            <Truck size={16} className="text-cobalt" /> Return Method
          </h4>
          <div className="flex items-center gap-3 p-3 bg-[#F8F9FA] rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-cobalt-light flex items-center justify-center">
              {ret.method === 'mail' && <Truck size={18} className="text-cobalt" />}
              {ret.method === 'pickup' && <Truck size={18} className="text-cobalt" />}
              {ret.method === 'in-store' && <MapPin size={18} className="text-cobalt" />}
            </div>
            <div>
              <p className="text-[0.88rem]" style={{ fontWeight: 500 }}>
                {ret.method === 'mail' ? 'Mail Drop-off' : ret.method === 'pickup' ? 'Scheduled Pickup' : 'In-Store Return'}
              </p>
              <p className="text-[0.78rem] text-muted-foreground">
                {ret.method === 'mail' ? 'Drop off at carrier location' : ret.method === 'in-store' ? 'Bring to any store location' : 'Carrier will pick up'}
              </p>
            </div>
          </div>
        </div>

        {/* Label card */}
        {(ret.status === 'Label created' || ret.status === 'Dropped off' || ret.status === 'In transit') && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h4 className="mb-3">Return Label</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadLabel}
                className="h-9 px-4 rounded-xl border border-border text-[0.85rem] flex items-center gap-1.5 hover:bg-accent cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <Download size={14} /> Download PDF
              </button>
              <button
                onClick={handleShowQR}
                className="h-9 px-4 rounded-xl border border-border text-[0.85rem] flex items-center gap-1.5 hover:bg-accent cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <QrCode size={14} /> Show QR
              </button>
              <button
                onClick={handlePrint}
                className="h-9 px-4 rounded-xl border border-border text-[0.85rem] flex items-center gap-1.5 hover:bg-accent cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <Printer size={14} /> Print
              </button>
            </div>
          </div>
        )}

        {/* Refund card */}
        {ret.refund_amount && (
          <div className="bg-white rounded-2xl border border-border p-5">
            <h4 className="mb-3 flex items-center gap-2">
              <DollarSign size={16} className="text-cobalt" /> Refund
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Amount</span>
                <span className="text-[0.85rem]" style={{ fontWeight: 600 }}>${ret.refund_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[0.85rem] text-muted-foreground">Status</span>
                <StatusPill status={ret.status === 'Refunded' ? 'Refunded' : 'Refund pending'} />
              </div>
              {ret.refund_timeline_estimate && (
                <div className="flex justify-between">
                  <span className="text-[0.85rem] text-muted-foreground">Timeline</span>
                  <span className="text-[0.85rem]">{ret.refund_timeline_estimate}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <h4>Items Being Returned</h4>
            {!editingItems ? (
              <button
                onClick={() => setEditingItems(true)}
                className="h-8 px-3 rounded-xl border border-border text-[0.78rem] hover:bg-accent cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                Edit names
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setItemsDraft((ret.items || []).join('\n'));
                    setEditingItems(false);
                  }}
                  className="h-8 px-3 rounded-xl border border-border text-[0.78rem] hover:bg-accent cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSaveItems()}
                  className="h-8 px-3 rounded-xl bg-cobalt text-white text-[0.78rem] hover:bg-cobalt-dark cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  Save
                </button>
              </div>
            )}
          </div>

          {editingItems ? (
            <div>
              <p className="text-[0.78rem] text-muted-foreground mb-2">
                One item per line.
              </p>
              <textarea
                value={itemsDraft}
                onChange={(event) => setItemsDraft(event.target.value)}
                rows={5}
                className="w-full rounded-xl bg-[#F8F9FA] border border-border text-[0.88rem] outline-none focus:border-cobalt p-3"
              />
            </div>
          ) : (
            <div className="space-y-2">
              {ret.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-2.5 bg-[#F8F9FA] rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                    <span className="text-[0.7rem] text-muted-foreground" style={{ fontWeight: 600 }}>{i + 1}</span>
                  </div>
                  <span className="text-[0.85rem]">{item}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <QRCodeModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        returnId={ret.return_id}
        trackingNumber={ret.order_number}
      />
    </div>
  );
}
