import { ToastProvider, ToastViewport } from '@/ui/toast';
import { useToast } from '@/hooks/useToast';

export const ToastContainer = () => {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map((toast) => (
        <div key={toast.id}>{toast.component}</div>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

