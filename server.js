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
      
      // ذخیره اطلاعات اتاق و نوبت
      rooms[roomId] = { 
        requester: requesterId, 
        accepter: shortId,
        currentTurn: requesterId // بازیکن اول شروع می‌کند
      };
      
      io.to(onlineUsers[requesterId]).emit('game-started', { room: roomId, requester: requesterId, turn: requesterId });
      socket.emit('game-started', { room: roomId, requester: requesterId, turn: requesterId });
    }
  });

  // مدیریت ارسال تاس
  socket.on('dice-rolled', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        socket.to(roomId).emit('opponent-dice', data);
        break;
      }
    }
  });

  // مدیریت حرکت مهره
  socket.on('make-move', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        socket.to(roomId).emit('opponent-move', data);
        break;
      }
    }
  });

  // مدیریت پایان نوبت (وقتی کسی نمی‌تونه حرکت کنه)
  socket.on('end-turn', () => {
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        // نوبت رو عوض کن
        rooms[roomId].currentTurn = (rooms[roomId].currentTurn === shortId) ? rooms[roomId].accepter : rooms[roomId].requester;
        // به هر دو نفر بگو نوبت عوض شد
        io.to(roomId).emit('turn-changed', { nextTurn: rooms[roomId].currentTurn });
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    delete onlineUsers[shortId];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
