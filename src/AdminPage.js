import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from './socket'; // Correct path for src/AdminPage.js

export default function AdminPage({ updateRoomActivity }) {
  const navigate = useNavigate();
  const [formState, setFormState] = useState({
    roomName: '',
    password: '',
  });
  const [error, setError] = useState(null);

  function onChange(e) {
    setFormState({ ...formState, [e.target.name]: e.target.value });
  }

  function onSubmit(e) {
    e.preventDefault();
    const roomId = Date.now().toString();
    const displayName = formState.roomName.trim();
    const password = formState.password;

    if (!displayName) {
      setError('Please enter a room name.');
      return;
    }

    console.log('Emitting createRoom with:', { roomId, displayName, password });
    socket.emit('createRoom', { roomId, displayName, password }, ({ success, message }) => {
      console.log('Received response from server:', { success, message });
      if (!success) {
        setError(message);
        return;
      }

      setFormState({ roomName: '', password: '' });
      setError(null);
      updateRoomActivity(roomId);
      navigate(`/room/${roomId}/owner`);
    });
  }

  return (
    <div className="admin-page">
      <h2>Create a New Room</h2>
      <form onSubmit={onSubmit}>
        <input
          onChange={onChange}
          placeholder="Room Name"
          name="roomName"
          value={formState.roomName}
        />
        <input
          onChange={onChange}
          type="password"
          placeholder="Admin Password"
          name="password"
          value={formState.password}
        />
        <button type="submit">Create Room</button>
      </form>
      {error && <p className="error">{error}</p>}
      <button onClick={() => navigate('/')} className="back-button">
        Back to Rooms
      </button>
    </div>
  );
}