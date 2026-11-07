const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let onlineUsers = {};
let rooms = {};

io.on('connection', (socket) => {
  let shortId = Math.floor(1000 + Math.random() * 9000).toString();
  while (onlineUsers[shortId]) {
    shortId = Math.floor(1000 + Math.random() * 9000).toString();
  }

  onlineUsers[shortId] = socket.id;
  socket.join(shortId);
  socket.emit('your-id', shortId);

  socket.on('request-connect', (opponentId) => {
    if (onlineUsers[opponentId]) {
      io.to(onlineUsers[opponentId]).emit('incoming-request', { from: shortId });
    }
  });

  socket.on('accept-connect', (requesterId) => {
    if (onlineUsers[requesterId]) {
      const roomId = `${requesterId}-${shortId}`;
      socket.join(roomId);
      io.to(onlineUsers[requesterId]).socketsJoin(roomId);
      
      rooms[roomId] = { 
        requester: requesterId, 
        accepter: shortId,
        currentTurn: requesterId 
      };
      
      io.to(onlineUsers[requesterId]).emit('game-started', { requester: requesterId, turn: requesterId });
      socket.emit('game-started', { requester: requesterId, turn: requesterId });
    }
  });

  socket.on('dice-rolled', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        socket.to(roomId).emit('opponent-dice', data);
        break;
      }
    }
  });

  socket.on('make-move', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        socket.to(roomId).emit('opponent-move', data);
        break;
      }
    }
  });

  socket.on('end-turn', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        if (data && data.winner) {
            io.to(roomId).emit('game-over', { winner: shortId });
            break;
        }

        if (data && data.dice === 6) {
            io.to(onlineUsers[shortId]).emit('turn-changed', { nextTurn: shortId });
        } else {
            let next = (rooms[roomId].currentTurn === rooms[roomId].requester) ? rooms[roomId].accepter : rooms[roomId].requester;
            rooms[roomId].currentTurn = next;
            io.to(roomId).emit('turn-changed', { nextTurn: next });
        }
        break;
      }
    }
  });

  // 🚨 بخش جدید: انتقال پیام‌های تماس صوتی (WebRTC Signaling)
  socket.on('webrtc-signal', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        // پیام رو به حریف بفرست
        socket.to(roomId).emit('webrtc-signal', data);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        socket.to(roomId).emit('opponent-disconnected');
        delete rooms[roomId];
      }
    }
    delete onlineUsers[shortId];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
