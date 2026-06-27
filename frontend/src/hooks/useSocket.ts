'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const runtimeEnv = (typeof window !== 'undefined' ? (window as any).__ENV__ : undefined);
    const socketUrl = runtimeEnv?.NEXT_PUBLIC_API_URL || undefined;

    // Fetch user to get org_id for socket room join
    api.get('/auth/me').then((res) => {
      const orgId = res.data.user?.organizationId;
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
        query: orgId ? { org_id: orgId } : undefined,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });
    }).catch(() => {
      // Fallback without org_id
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        setConnected(true);
      });

      socket.on('disconnect', () => {
        setConnected(false);
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
