import { useEffect, useState, useReducer, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import socket from './socket';
import './ChatRoom.css';

// Initial state for the chat room
const initialRoomState = {
  items: [], // Combined array for messages and notifications
  onlineUsers: [], // Track online users
  seenNotificationIds: new Set(), // Track seen notification IDs to prevent duplicates
};

// Reducer for managing chat room state
function roomReducer(state, action) {
  switch (action.type) {
    case 'RESET':
      return { ...initialRoomState, seenNotificationIds: new Set() };
    case 'SET_ITEMS':
      const newSeenNotificationIds = new Set(state.seenNotificationIds);
      const filteredItems = action.items.filter((item) => {
        if (item.type === 'notification') {
          if (newSeenNotificationIds.has(item.id)) return false;
          newSeenNotificationIds.add(item.id);
          return true;
        }
        return true;
      });
      return {
        ...state,
        items: filteredItems.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp)),
        seenNotificationIds: newSeenNotificationIds,
      };
    case 'ADD_OR_UPDATE_ITEM':
      if (action.item.type === 'notification') {
        if (state.seenNotificationIds.has(action.item.id)) return state;
        const newSeenIds = new Set(state.seenNotificationIds);
        newSeenIds.add(action.item.id);
        return {
          ...state,
          items: [...state.items, action.item]
            .sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp))
            .slice(-50), // Keep only the last 50 items
          seenNotificationIds: newSeenIds,
        };
      }
      const existingIndex = state.items.findIndex(
        (item) => item.tempId === action.item.tempId || item.messageId === action.item.messageId
      );
      if (existingIndex !== -1) {
        // Update existing item
        const updatedItems = [...state.items];
        updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...action.item, id: action.item.messageId, status: 'sent' };
        return {
          ...state,
          items: updatedItems.sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp)),
        };
      }
      // Add new item
      return {
        ...state,
        items: [...state.items, { ...action.item, id: action.item.messageId, status: action.item.status || 'sent' }]
          .sort((a, b) => (a.serverTimestamp || a.timestamp) - (b.serverTimestamp || b.timestamp))
          .slice(-50), // Keep only the last 50 items
      };
    case 'SET_ONLINE_USERS':
      // Ensure unique roles
      const uniqueUsers = [...new Set(action.users)];
      return {
        ...state,
        onlineUsers: uniqueUsers,
      };
    default:
      return state;
  }
}

export default function ChatRoom({ updateRoomActivity }) {
  const { roomId, role } = useParams();
  const navigate = useNavigate();
  const [roomState, dispatch] = useReducer(roomReducer, initialRoomState);
  const [isRoomLoading, setIsRoomLoading] = useState(false);
  const [messageFormState, setMessageForm] = useState({ message: '' });
  const [roomData, setRoomData] = useState(null);
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [isAtBottom, setIsAtBottom] = useState(true); // Track if user is at the bottom
  const messagesEndRef = useRef(null);
  const messageContainerRef = useRef(null); // Reference to the message container
  const hasJoinedRef = useRef(false);
  const hasLeftRef = useRef(false);
  const lastScrollTopRef = useRef(0); // Track the last scroll position

  const userId = localStorage.getItem(`userId-${role}`) || `${role}-${Date.now()}`;
  localStorage.setItem(`userId-${role}`, userId);

  // Scroll to the bottom of the chat
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Check if the user is at the bottom of the chat
  const checkIfAtBottom = useCallback(() => {
    if (!messageContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messageContainerRef.current;
    // Consider the user to be at the bottom if they are within 50 pixels of the bottom
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
    lastScrollTopRef.current = scrollTop; // Update the last scroll position
  }, []);

  // Set up scroll event listener to track the user's position
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (messageContainer) {
      messageContainer.addEventListener('scroll', checkIfAtBottom);
      // Initial check
      checkIfAtBottom();
    }
    return () => {
      if (messageContainer) {
        messageContainer.removeEventListener('scroll', checkIfAtBottom);
      }
    };
  }, [checkIfAtBottom]);

  // Scroll to bottom when items change (new message received or sent)
  useEffect(() => {
    const messageContainer = messageContainerRef.current;
    if (!messageContainer) return;

    const { scrollTop, scrollHeight, clientHeight } = messageContainer;
    const isUserScrollingUp = scrollTop < lastScrollTopRef.current;

    // Get the latest item to determine if it's a sent or received message
    const latestItem = roomState.items[roomState.items.length - 1];

    if (latestItem) {
      if (latestItem.type === 'notification') {
        // Always scroll to bottom for notifications
        scrollToBottom();
      } else if (latestItem.role === role) {
        // For sent messages, only scroll if the user is at the bottom or not scrolling up
        if (isAtBottom || !isUserScrollingUp) {
          scrollToBottom();
        }
      } else {
        // For received messages, always scroll to bottom unless the user is actively scrolling up
        if (!isUserScrollingUp) {
          scrollToBottom();
        }
      }
    }
  }, [roomState.items, isAtBottom, scrollToBottom]);

  // Handle Socket.IO connection events
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      if (roomId && role && hasJoinedRef.current && !hasLeftRef.current) {
        socket.emit('joinRoom', { roomId, role, userId });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      if (!hasLeftRef.current && roomId && role && userId) {
        socket.emit('leaveRoom', { roomId, role, userId });
        hasLeftRef.current = true;
      }
    };

    const handleRoomFull = ({ message }) => {
      alert(message);
      navigate('/', { replace: true });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleDisconnect);
    socket.on('roomFull', handleRoomFull);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleDisconnect);
      socket.off('roomFull', handleRoomFull);
    };
  }, [roomId, role, userId, navigate]);

  // Set up real-time event listeners
  useEffect(() => {
    const handleReceiveMessage = (item) => {
      dispatch({
        type: 'ADD_OR_UPDATE_ITEM',
        item: item.type === 'message'
          ? { ...item, tempId: `${item.role}-${item.createdAt}` }
          : item,
      });
      // Scrolling is handled by the useEffect hook monitoring roomState.items
    };

    const handleRoomUpdated = (room) => {
      if (room.id === roomId) {
        const roles = Object.values(room.participants || {}).map((p) => p.role);
        dispatch({ type: 'SET_ONLINE_USERS', users: roles });
      }
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('roomUpdated', handleRoomUpdated);

    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('roomUpdated', handleRoomUpdated);
    };
  }, [roomId, role, userId, updateRoomActivity]);

  // Join the room and fetch initial messages
  useEffect(() => {
    if (!roomId || !role || !isConnected) return;

    if (!hasJoinedRef.current) {
      setIsRoomLoading(true);
      dispatch({ type: 'RESET' });

      socket.emit('joinRoom', { roomId, role, userId });
      updateRoomActivity(roomId);
      hasJoinedRef.current = true;
    }

    socket.emit('getMessages', { roomId }, (items) => {
      dispatch({ type: 'SET_ITEMS', items });
      setIsRoomLoading(false);
      // Always scroll to bottom when initially loading messages
      scrollToBottom();
    });
  }, [roomId, role, userId, updateRoomActivity, isConnected, scrollToBottom]);

  // Emit leaveRoom on page unload or navigation
  useEffect(() => {
    const emitLeaveRoom = () => {
      if (!hasLeftRef.current && roomId && role && userId) {
        socket.emit('leaveRoom', { roomId, role, userId });
        hasLeftRef.current = true;
      }
    };

    const handleBeforeUnload = () => emitLeaveRoom();
    const handleNavigation = () => emitLeaveRoom();

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handleNavigation);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handleNavigation);
    };
  }, [roomId, role, userId]);

  // Fetch room data
  useEffect(() => {
    if (!roomId || !role || !['anonymous', 'owner'].includes(role)) {
      navigate('/');
      return;
    }

    socket.emit('getRooms', (rooms) => {
      const room = rooms.find((r) => r.id === roomId);
      if (!room) {
        navigate('/', { replace: true });
        return;
      }
      setRoomData({
        displayName: room.displayName,
        createdAt: room.createdAt,
        expiresAt: room.expiresAt,
        anonymousUrl: room.anonymousUrl,
        ownerUrl: room.ownerUrl,
        lastActivity: room.lastActivity,
      });
      const roles = Object.values(room.participants || {}).map((p) => p.role);
      dispatch({ type: 'SET_ONLINE_USERS', users: roles });
    });
  }, [roomId, role, navigate]);

  function onMessageChange(e) {
    setMessageForm({ ...messageFormState, [e.target.name]: e.target.value });
  }

  function sendMessage(e) {
    e.preventDefault();
    if (!messageFormState.message.trim()) return;

    const createdAt = Date.now();
    const tempId = `${role}-${createdAt}`; // Simplified tempId

    dispatch({
      type: 'ADD_OR_UPDATE_ITEM',
      item: {
        id: tempId,
        tempId,
        messageId: tempId, // Use tempId as messageId until server provides the real one
        type: 'message',
        role,
        message: messageFormState.message,
        createdAt,
        status: 'sending',
      },
    });

    socket.emit(
      'sendMessage',
      { roomId, role, message: messageFormState.message, createdAt },
      ({ success, messageId }) => {
        if (success) {
          dispatch({
            type: 'ADD_OR_UPDATE_ITEM',
            item: {
              id: messageId,
              tempId,
              messageId,
              type: 'message',
              role,
              message: messageFormState.message,
              createdAt,
              status: 'sent',
            },
          });
          // Scrolling is handled by the useEffect hook monitoring roomState.items
        }
      }
    );

    setMessageForm({ message: '' });
    updateRoomActivity(roomId);
  }

  const getInitials = (userRole) => {
    if (userRole === 'anonymous') return 'A';
    if (userRole === 'owner') return 'O';
    return userRole.charAt(0).toUpperCase();
  };

  return (
    <div className="chat-room">
      <h2>Room: {roomData?.displayName || roomId}</h2>
      <div className="chat-actions">
        <button onClick={() => navigate('/')} className="leave-button">
          Leave Room
        </button>
      </div>
      {!isConnected && <p className="error">Disconnected from server. Trying to reconnect...</p>}
      {isRoomLoading ? (
        <p className="loading">Loading room messages...</p>
      ) : (
        <>
          {/* Participants Section */}
          <div className="participants-section">
            {roomState.onlineUsers.map((userRole, index) => (
              <div key={`${userRole}-${index}`} className="participant">
                <span className="avatar">{getInitials(userRole)}</span>
                <span>{userRole === 'anonymous' ? 'Anonymous User' : 'Car Owner'}</span>
              </div>
            ))}
          </div>
          <div className="message-container" ref={messageContainerRef}>
            {roomState.items.map((item, index) => (
              <div
                key={item.id || `${item.type}-${index}`} // Fallback to index if id is not unique
                className={item.type === 'message' ? `message-bubble ${item.role === role ? 'message-sent' : 'message-received'}` : 'notification'}
              >
                {item.type === 'message' ? (
                  <div className="message-body">
                    <div className="message-content">{item.message}</div>
                    <div className="message-meta">
                      <span className="message-time">
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {item.role === role && (
                        <span className="message-status">
                          {item.status === 'sending' ? 'Sending...' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {item.message} at{' '}
                    {new Date(item.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="message-form">
            <input
              onChange={onMessageChange}
              placeholder="Type a message..."
              name="message"
              value={messageFormState.message}
              disabled={!isConnected}
            />
            <button type="submit" disabled={!isConnected}>
              Send
            </button>
          </form>
        </>
      )}
    </div>
  );
}