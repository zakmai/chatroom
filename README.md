# Gun Chat

A real-time chat application built with React, Socket.IO, and Express. Users can create rooms, join as "Car Owner" or "Anonymous," send messages, and view a global conversation feed. Rooms expire after 1 hour or 30 minutes of inactivity.

## Features
- **Room Creation**: Create chat rooms with a name and optional password.
- **Role-Based Access**: Join rooms as "Car Owner" (owner) or "Anonymous."
- **Real-Time Messaging**: Send and receive messages instantly via Socket.IO.
- **Room List**: View and join active rooms.
- **Global Conversation**: See a feed of messages across all rooms (limited to 50).
- **Inactivity Cleanup**: Rooms are deleted after 30 minutes of inactivity or 1-hour expiry.

## Tech Stack
- **Frontend**: React, React Router, Socket.IO Client
- **Backend**: Node.js, Express, Socket.IO
- **Dependencies**: `uuid` for unique IDs

## Prerequisites
- Node.js (v20.18.0 recommended)
- npm (or yarn)

## Project Structure


gun-app/
├── react-gun/              # Frontend (React app)
│   ├── src/
│   │   ├── components/
│   │   │   ├── GlobalConversation.js  # Global message feed
│   │   │   └── RoomList.js       # Room list UI
│   │   ├── hooks/
│   │   │   ├── useGlobalMessages.js  # Legacy hook (possibly unused)
│   │   │   └── useRooms.js       # Room management hook
│   │   ├── AdminPage.js          # Room creation UI
│   │   ├── App.js                # Main app with routes
│   │   ├── ChatRoom.js           # Room-specific chat UI
│   │   ├── socket.js             # Socket.IO client setup
│   │   ├── index.js              # Entry point
│   │   └── [other files]         # CSS, tests, etc.
│   └── package.json
├── server.js               # Backend (Socket.IO server)
└── package.json

Install Backend Dependencies
cd gun-app
npm install express socket.io uuid


Install Frontend Dependencies:

cd react-gun
npm install


Running Locally
Development Mode
Start Backend (port 3031):

cd gun-app
npm start

Start Frontend (port 3000):
cd react-gun
npm start


Usage:
Visit http://localhost:3000/admin to create a room.
Join rooms from the main page (/) or via URLs like /room/<roomId>/owner.

Build Frontend:
cd gun-app/react-gun
npm run build

Move Build:
bash

Collapse

Wrap

Copy
cp -r build ../
Start Server:
bash

Collapse

Wrap

Copy
cd gun-app
npm start
Access at http://localhost:3031
Deployment to GitHub
Initialize Git (if not already done):
bash

Collapse

Wrap

Copy
cd gun-app
git init
Create .gitignore:
text

Collapse

Wrap

Copy
node_modules/
react-gun/build/
*.log
Add Files:
bash

Collapse

Wrap

Copy
git add .
Commit:
bash

Collapse

Wrap

Copy
git commit -m "Initial commit of Gun Chat app"
Create GitHub Repository:
Go to GitHub, log in, and click "New Repository."
Name it (e.g., gun-chat), keep it public or private, and don’t initialize with a README (we’ve got one).
Link and Push:
bash

Collapse

Wrap

Copy
git remote add origin https://github.com/<your-username>/gun-chat.git
git branch -M main
git push -u origin main
Notes
Password: Currently hardcoded as 'admin123' in useRooms. Update to dynamic passwords if needed (see AdminPage.js).
Global Messages: Requires backend support (not implemented in server.js yet).
Port: Backend runs on 3031 to avoid conflicts with 3030.




