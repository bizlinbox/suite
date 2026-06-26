'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface WabaAccount {
  id: string;
  name: string;
  phoneNumberId: string;
  businessAccountId: string;
  isActive: boolean;
}

interface WabaContextValue {
  selectedWabaId: string | null;
  setSelectedWabaId: (id: string | null) => void;
}

const WabaContext = createContext<WabaContextValue>({
  selectedWabaId: null,
  setSelectedWabaId: () => {},
});

const STORAGE_KEY = 'bizlinbox:waba';

export function useWaba() {
  return useContext(WabaContext);
}

interface WabaProviderProps {
  children: React.ReactNode;
  wabaAccounts: WabaAccount[];
}

export function WabaProvider({ children, wabaAccounts }: WabaProviderProps) {
  const [selectedWabaId, setSelectedWabaIdState] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      setSelectedWabaIdState(stored || null);
    }
    setMounted(true);
  }, []);

  const setSelectedWabaId = useCallback((id: string | null) => {
    setSelectedWabaIdState(id);
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Auto-select first available WABA when accounts change or on mount
  useEffect(() => {
    if (!mounted) return;

    const activeAccounts = wabaAccounts.filter((a) => a.isActive);
    if (activeAccounts.length === 0) {
      if (selectedWabaId !== null) {
        setSelectedWabaId(null);
      }
      return;
    }

    const isValid = selectedWabaId && activeAccounts.some((a) => a.id === selectedWabaId);
    if (!isValid) {
      setSelectedWabaId(activeAccounts[0].id);
    }
  }, [wabaAccounts, mounted, selectedWabaId, setSelectedWabaId]);

  return (
    <WabaContext.Provider value={{ selectedWabaId, setSelectedWabaId }}>
      {children}
    </WabaContext.Provider>
  );
}
