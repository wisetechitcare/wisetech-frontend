import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_APP_WISE_TECH_BACKEND as string;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      path: '/socket.io/',
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket!.id);
    });
    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });
    socket.on('disconnect', (reason) => {
      console.warn('[Socket] Disconnected:', reason);
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
