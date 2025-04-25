import { toast as sonnerToast } from 'sonner';

interface ToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

export function useToast() {
  const toast = ({ title, description, duration = 3000 }: ToastOptions) => {
    sonnerToast(title || description, {
      description: title ? description : undefined,
      duration,
    });
  };

  return { toast };
} 