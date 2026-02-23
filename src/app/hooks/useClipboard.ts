import { useState } from 'react';
import { toast } from 'sonner';

export function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = async (text: string, successMessage = 'Copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(successMessage);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch (error) {
      toast.error('Failed to copy to clipboard');
      return false;
    }
  };

  return { copy, copied };
}
