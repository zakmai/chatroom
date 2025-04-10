import { useEffect, useReducer, useState } from 'react';

const initialGlobalState = {
  globalMessages: [],
};

function globalReducer(state, action) {
  if (action.type === 'REMOVE_ROOM') {
    return {
      globalMessages: state.globalMessages.filter((msg) => msg.room !== action.roomId),
    };
  }
  if (action.type === 'ADD_MESSAGE') {
    if (state.globalMessages.some((msg) => msg.id === action.message.id)) {
      return state;
    }
    return {
      globalMessages: [action.message, ...state.globalMessages],
    };
  }
  return state;
}

export default function useGlobalMessages(gun) {
  const [state, dispatch] = useReducer(globalReducer, initialGlobalState);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    const roomsNode = gun.get('rooms');
    const handleRoomUpdate = (_, roomId) => {
      if (roomId) {
        const roomMessages = gun.get(`room-${roomId}`);
        const seenMessages = new Set();

        roomMessages.map().on((m, id) => {
          if (!m) {
            dispatch({
              type: 'REMOVE_MESSAGE',
              id,
            });
            return;
          }
          if (!seenMessages.has(id)) {
            seenMessages.add(id);
            dispatch({
              type: 'ADD_MESSAGE',
              message: {
                id,
                room: roomId,
                name: m.name,
                message: m.message,
                createdAt: m.createdAt,
              },
            });
          }
        });
      }
    };

    roomsNode.map().on(handleRoomUpdate);

    setTimeout(() => setIsLoading(false), 1000);

    return () => {
      roomsNode.map().off();
    };
  }, [gun]);

  return { globalMessages: state.globalMessages, isLoading, dispatch };
}