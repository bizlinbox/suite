'use client';

import { useEffect, useState } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

let listeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

function notify() {
  listeners.forEach((fn) => fn([...toasts]));
}

export function toast(message: string, type: Toast['type'] = 'info') {
  const id = Math.random().toString(36).slice(2);
  toasts = [...toasts, { id, message, type }];
  notify();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

export function toastError(message: string) {
  toast(message, 'error');
}

export function toastSuccess(message: string) {
  toast(message, 'success');
}

export default function Toaster() {
  const [, setLocalToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (current: Toast[]) => setLocalToasts(current);
    listeners.push(handler);
    return () => {
      listeners = listeners.filter((l) => l !== handler);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 ${
            t.type === 'error'
              ? 'bg-red-600 text-white'
              : t.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-gray-900 text-white'
          }`}
        >
          {t.type === 'error' && <AlertCircle size={16} />}
          {t.type === 'success' && <CheckCircle size={16} />}
          {t.type === 'info' && <Info size={16} />}
          <span className="max-w-xs">{t.message}</span>
          <button
            onClick={() => {
              toasts = toasts.filter((x) => x.id !== t.id);
              notify();
            }}
            className="ml-1 rounded p-0.5 opacity-70 hover:opacity-100"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
