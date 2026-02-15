/**
 * Display a temporary toast message on screen.
 */
export function showToast(message: string, duration: number = 5000): void {
  if (typeof document === 'undefined' || !document.body) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = 'toast toast--error';
  toast.textContent = message;
  toast.setAttribute('role', 'alert');

  document.body.appendChild(toast);

  // Fade in
  setTimeout(() => toast.classList.add('toast--visible'), 10);

  // Fade out and remove
  setTimeout(() => {
    toast.classList.remove('toast--visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}
