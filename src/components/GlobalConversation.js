export default function GlobalConversation({ globalMessages, isLoading }) {
  // Limit to 50 global messages to reduce memory usage
  const displayedMessages = globalMessages.slice(0, 50);

  return (
    <div className="global-section">
      <h2>Global Conversation (All Rooms)</h2>
      {isLoading ? (
        <p className="loading">Loading global messages...</p>
      ) : displayedMessages.length === 0 ? (
        <p>No messages yet across all rooms.</p>
      ) : (
        <div className="message-list">
          {displayedMessages.map((message) => (
            <div key={message.id} className="global-message">
              <h2>{message.message}</h2>
              <p>Room: {message.room}</p>
              <p>
                Room URL:{' '}
                <a
                  href={`${window.location.origin}/room/${message.room}/anonymous`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="App-link"
                >
                  {`${window.location.origin}/room/${message.room}/anonymous`}
                </a>
              </p>
              <p>Date: {new Date(message.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}