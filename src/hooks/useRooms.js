import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import socket from '../socket'; // Update the path to point to src/socket.js

// Inactivity period (30 minutes = 1800000 milliseconds)
const INACTIVITY_PERIOD = 1800000;

export default function useRooms(_, navigate) {
  const [rooms, setRooms] = useState([]);
  const [roomFormState, setRoomForm] = useState({ roomName: '' });

  useEffect(() => {
    // Fetch initial rooms
    socket.emit('getRooms', (roomsArray) => {
      setRooms(roomsArray);
    });

    // Listen for room updates
    socket.on('roomCreated', (roomData) => {
      setRooms((prevRooms) => [...prevRooms, roomData]);
    });

    socket.on('roomDeleted', (roomId) => {
      setRooms((prevRooms) => prevRooms.filter((r) => r.id !== roomId));
    });

    socket.on('roomUpdated', (roomData) => {
      setRooms((prevRooms) =>
        prevRooms.map((r) => (r.id === roomData.id ? roomData : r))
      );
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomDeleted');
      socket.off('roomUpdated');
    };
  }, []);

  useEffect(() => {
    const checkInactiveRooms = () => {
      const now = Date.now();
      rooms.forEach((room) => {
        if (room.lastActivity && now - room.lastActivity >= INACTIVITY_PERIOD) {
          socket.emit('deleteRoom', { roomId: room.id, password: 'admin123' });
        }
        if (room.expiresAt && now > room.expiresAt) {
          socket.emit('deleteRoom', { roomId: room.id, password: 'admin123' });
        }
      });
    };

    const interval = setInterval(checkInactiveRooms, 30000);
    return () => clearInterval(interval);
  }, [rooms]);

  function onRoomChange(e) {
    setRoomForm({ ...roomFormState, [e.target.name]: e.target.value });
  }

  function createRoom(e, shouldNavigate = true) {
    e.preventDefault();
    const displayName = roomFormState.roomName.trim();
    if (!displayName) {
      alert('Please enter a room name.');
      return;
    }

    const roomId = uuidv4();
    socket.emit('createRoom', { roomId, displayName, password: 'admin123' }, ({ success, message }) => {
      if (!success) {
        alert(message);
        return;
      }

      setRoomForm({ roomName: '' });
      if (shouldNavigate) {
        navigate(`/room/${roomId}/anonymous`);
      }
    });
  }

  function deleteRoom(roomId) {
    socket.emit('deleteRoom', { roomId, password: 'admin123' }, ({ success, message }) => {
      if (!success) {
        alert(message);
      }
    });
  }

  const updateRoomActivity = useCallback((roomId) => {
    socket.emit('updateRoomActivity', { roomId });
  }, []);

  return { rooms, roomFormState, onRoomChange, createRoom, deleteRoom, updateRoomActivity };
}