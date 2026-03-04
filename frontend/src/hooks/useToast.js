import { useCallback } from 'react';

export const useToast = () => {
  const toast = useCallback(({ title, description, type = 'default', variant, duration = 5000 }) => {
    const resolvedType = variant || type;

    const toastElement = document.createElement('div');
    toastElement.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md transform transition-all ${
      resolvedType === 'success'
        ? 'bg-green-50 border border-green-200 text-green-800'
        : resolvedType === 'destructive'
        ? 'bg-red-50 border border-red-200 text-red-800'
        : 'bg-blue-50 border border-blue-200 text-blue-800'
    }`;

    const wrapper = document.createElement('div');
    wrapper.className = 'flex items-start';

    const content = document.createElement('div');
    content.className = 'flex-1';

    const titleEl = document.createElement('p');
    titleEl.className = 'font-semibold';
    titleEl.textContent = title || '';
    content.appendChild(titleEl);

    if (description) {
      const descEl = document.createElement('p');
      descEl.className = 'text-sm mt-1';
      descEl.textContent = description;
      content.appendChild(descEl);
    }

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ml-4 text-gray-400 hover:text-gray-600';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.innerHTML = `<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>`;
    closeBtn.addEventListener('click', () => toastElement.remove());

    wrapper.appendChild(content);
    wrapper.appendChild(closeBtn);
    toastElement.appendChild(wrapper);

    document.body.appendChild(toastElement);

    setTimeout(() => {
      toastElement.style.transform = 'translateX(0)';
      toastElement.style.opacity = '1';
    }, 10);

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

