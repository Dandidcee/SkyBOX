import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false, // Kita konek manual setelah login atau komponen mount
    });
  }
  return socket;
};

export const connectSocket = (accountId: string) => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit('join_account', accountId);
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};
