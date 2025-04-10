export default function RoomList({ rooms, roomFormState, onRoomChange, createRoom, deleteRoom, navigate }) {
  return (
    <div className="room-list">
      <h2>Join a Room</h2>
      <form onSubmit={createRoom}>
        <input
          onChange={onRoomChange}
          placeholder="New Room Name"
          name="roomName"
          value={roomFormState.roomName}
        />
        <button type="submit">Create Room Anonymously</button>
      </form>
      {rooms.map((room) => (
        <div key={room.id} className="room-item">
          <h3>{room.displayName}</h3>
          <p>Created: {new Date(room.createdAt).toLocaleString()}</p>
          <p>Expires: {new Date(room.expiresAt).toLocaleString()}</p>
          <button onClick={() => navigate(room.anonymousUrl)}>Join as Anonymous</button>
          <button onClick={() => navigate(room.ownerUrl)}>Join as Car Owner</button>
          <button onClick={() => deleteRoom(room.id)} className="delete-button">
            Delete Room
          </button>
        </div>
      ))}
    </div>
  );
}