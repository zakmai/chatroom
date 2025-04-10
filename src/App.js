import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom'; // Remove BrowserRouter here
import ChatRoom from './ChatRoom'; // Adjust path as needed
import { v4 as uuid } from 'uuid';
import socket from './socket'; // Adjust path as needed

// App.jsx should be the only place with <Router>
function App() {
  return (
    <Routes>
      <Route path="/" element={<MainPage />} />
      <Route path="/room/:roomId/:role" element={<ChatRoom updateRoomActivity={(roomId) => console.log(`Room ${roomId} activity updated`)} />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  );
}

function MainPage() {
  const [rooms, setRooms] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit('getRooms', (roomList) => {
      setRooms(roomList);
    });

    const handleRoomUpdated = () => {
      socket.emit('getRooms', (roomList) => {
        setRooms(roomList);
      });
    };

    socket.on('roomUpdated', handleRoomUpdated);
    return () => {
      socket.off('roomUpdated', handleRoomUpdated);
    };
  }, []);

  return (
    <div className="main-page">
      <h1>Chat Rooms</h1>
      <Link to="/admin">
        <button>Create Room</button>
      </Link>
      <div className="room-list">
        {rooms.map((room) => (
          <div key={room.id} className="room">
            <h3>{room.displayName}</h3>
            <button onClick={() => navigate(`/room/${room.id}/owner`)}>
              Join as Car Owner
            </button>
            <button onClick={() => navigate(`/room/${room.id}/anonymous`)}>
              Join as Anonymous
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminPage() {
  const [roomName, setRoomName] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleCreateRoom = (e) => {
    e.preventDefault();
    const roomId = uuid();
    socket.emit('createRoom', { roomId, displayName: roomName, password }, ({ success, error }) => {
      if (success) {
        navigate(`/room/${roomId}/owner`);
      } else {
        alert(error || 'Failed to create room');
      }
    });
  };

  return (
    <div className="admin-page">
      <h1>Create a New Room</h1>
      <form onSubmit={handleCreateRoom}>
        <div>
          <label>Room Name:</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Create Room</button>
      </form>
      <Link to="/">
        <button>Back to Main Page</button>
      </Link>
    </div>
  );
}

export default App;