'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';

let globalSocket: Socket | null = null;
let globalConnectionPromise: Promise<Socket | null> | null = null;

function getOrCreateSocket(): Promise<Socket | null> {
  if (globalSocket && globalSocket.connected) {
    return Promise.resolve(globalSocket);
  }

  if (globalConnectionPromise) {
    return globalConnectionPromise;
  }

  globalConnectionPromise = new Promise((resolve) => {
    const runtimeEnv = (typeof window !== 'undefined' ? (window as any).__ENV__ : undefined);
    const apiUrl = runtimeEnv?.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_API_URL || '';
    // Strip /api/v1 suffix if present so Socket.IO connects to the backend root
    const socketUrl = apiUrl ? apiUrl.replace(/\/api\/v1\/?$/, '') : undefined;

    const createSocket = () => {
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        withCredentials: true,
      });

      globalSocket = socket;

      socket.on('connect', () => {
        globalConnectionPromise = null;
        resolve(socket);
      });

      socket.on('disconnect', () => {
        // Socket will auto-reconnect
      });

      // Resolve after a timeout even if not connected, so callers aren't blocked
      setTimeout(() => {
        globalConnectionPromise = null;
        resolve(socket);
      }, 3000);
    };

    api.get('/auth/me')
      .then(() => {
        createSocket();
      })
      .catch(() => {
        createSocket();
      });
  });

  return globalConnectionPromise;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let mounted = true;
    let offConnect: (() => void) | null = null;
    let offDisconnect: (() => void) | null = null;

    getOrCreateSocket().then((socket) => {
      if (!mounted || !socket) return;
      socketRef.current = socket;
      setConnected(socket.connected);

      const onConnect = () => setConnected(true);
      const onDisconnect = () => setConnected(false);

      socket.on('connect', onConnect);
      socket.on('disconnect', onDisconnect);

      offConnect = () => socket.off('connect', onConnect);
      offDisconnect = () => socket.off('disconnect', onDisconnect);
    });

    return () => {
      mounted = false;
      offConnect?.();
      offDisconnect?.();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
