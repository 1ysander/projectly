import { Sparkles, ArrowRight, Send, X } from 'lucide-react';
import { copilotSuggestions } from '../../data/mock-data';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

interface CopilotPanelProps {
  open: boolean;
  onClose: () => void;
}

export function CopilotPanel({ open, onClose }: CopilotPanelProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  if (!open) return null;

  const handleSuggestionAction = (action: string) => {
    switch (action) {
      case 'Check tracking':
        navigate('/shipments');
        break;
      case 'Start return':
        navigate('/returns');
        break;
      case 'Link shipment':
        navigate('/shipments');
        break;
      case 'View refunds':
        navigate('/returns');
        break;
      default:
        toast.info(action);
    }
  };

  const handleSendQuery = () => {
    if (!query.trim()) return;
    toast.info(`Copilot: "${query}" - This feature is coming soon!`);
    setQuery('');
  };

  return (
    <aside className="hidden lg:flex flex-col w-[320px] h-[calc(100vh-64px)] bg-white border-l border-border fixed right-0 top-16 z-20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 border-b border-border">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-cobalt" strokeWidth={2} />
          <span className="text-[0.9rem]" style={{ fontWeight: 600 }}>Copilot</span>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-accent cursor-pointer">
          <X size={14} />
        </button>
      </div>

      {/* What changed */}
      <div className="px-5 pt-4 pb-3">
        <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wider" style={{ fontWeight: 600 }}>Since your last visit</p>
        <div className="mt-2 p-3 bg-cobalt-light rounded-xl">
          <p className="text-[0.85rem] text-cobalt-dark" style={{ fontWeight: 500 }}>
            2 deliveries updated, 1 refund issued, 1 item needs review.
          </p>
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        <p className="text-[0.75rem] text-muted-foreground uppercase tracking-wider mb-3" style={{ fontWeight: 600 }}>Suggestions</p>
        <div className="space-y-3">
          {copilotSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-3.5 bg-[#F8F9FA] rounded-xl border border-border hover:border-cobalt/30 transition-colors"
            >
              <p className="text-[0.85rem] text-foreground mb-2.5">{suggestion.text}</p>
              <button
                onClick={() => handleSuggestionAction(suggestion.action)}
                className="flex items-center gap-1.5 text-cobalt text-[0.8rem] cursor-pointer group"
                style={{ fontWeight: 500 }}
              >
                {suggestion.action}
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Ask input */}
      <div className="px-4 py-3 border-t border-border">
        <div className="flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 h-10">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Unify anything…"
            className="flex-1 bg-transparent text-[0.85rem] outline-none placeholder:text-muted-foreground/60"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendQuery();
              }
            }}
          />
          <button
            onClick={handleSendQuery}
            className="text-cobalt cursor-pointer disabled:opacity-50"
            disabled={!query.trim()}
          >
            <Send size={15} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}