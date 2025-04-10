import { io } from 'socket.io-client';

// Connect to the Socket.IO server running on localhost:3031
const socket = io('http://localhost:3031', {
  path: '/socket.io',
  transports: ['websocket', 'polling'], // Prefer WebSocket, fallback to polling
  reconnection: true, // Enable reconnection
  reconnectionAttempts: Infinity, // Keep trying to reconnect
  reconnectionDelay: 1000, // Wait 1 second between attempts
});

socket.on('connect_error', (error) => {
  console.error('Socket.IO connection error:', error);
});

socket.on('reconnect', (attempt) => {
  console.log(`Socket.IO reconnected after ${attempt} attempts`);
});

export default socket;