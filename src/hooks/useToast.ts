/**
 * Toast hook wrapper using sonner
 */
import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    const message = title || description || '';
    const detail = title && description ? description : undefined;

    if (variant === 'destructive') {
      sonnerToast.error(message, {
        description: detail,
      });
    } else {
      sonnerToast.success(message, {
        description: detail,
      });
    }
  };

  return { toast };
}
