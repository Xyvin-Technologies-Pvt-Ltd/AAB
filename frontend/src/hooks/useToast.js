import { useCallback } from 'react';

// Simple toast implementation using browser notifications
export const useToast = () => {
  const toast = useCallback(({ title, description, type = 'default', duration = 5000 }) => {
    // Create a simple toast notification
    const toastElement = document.createElement('div');
    toastElement.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transform transition-all ${
      type === 'success'
        ? 'bg-green-50 border border-green-200 text-green-800'
        : type === 'destructive'
        ? 'bg-red-50 border border-red-200 text-red-800'
        : 'bg-blue-50 border border-blue-200 text-blue-800'
    }`;
    
    toastElement.innerHTML = `
      <div class="flex items-start">
        <div class="flex-1">
          <p class="font-semibold">${title}</p>
          ${description ? `<p class="text-sm mt-1">${description}</p>` : ''}
        </div>
        <button class="ml-4 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;
    
    document.body.appendChild(toastElement);
    
    // Animate in
    setTimeout(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    if (duration > 0) {
      setTimeout(() => {
        toastElement.style.transform = 'translateX(100%)';
        toastElement.style.opacity = '0';
        setTimeout(() => toastElement.remove(), 300);
      }, duration);
    }
  }, []);

  return { toast };
};

