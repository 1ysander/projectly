import { type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-cobalt-light flex items-center justify-center mb-4">
        <Icon size={24} className="text-cobalt" strokeWidth={1.5} />
      </div>
      <h3 className="text-foreground mb-1.5">{title}</h3>
      <p className="text-[0.85rem] text-muted-foreground max-w-sm mb-5">{description}</p>
      {actionLabel && (
        <button
          onClick={onAction}
          className="h-10 px-5 rounded-xl bg-cobalt text-white text-[0.85rem] hover:bg-cobalt-dark transition-colors cursor-pointer"
          style={{ fontWeight: 500 }}
        >
          {actionLabel}
        </button>
      )}
      {secondaryLabel && (
        <button
          onClick={onSecondary}
          className="mt-2 text-cobalt text-[0.85rem] cursor-pointer hover:underline"
          style={{ fontWeight: 500 }}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
