const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let onlineUsers = {}; 
let userStatus = {};  
let rooms = {};

function broadcastOnlineUsers() {
  const usersList = Object.keys(onlineUsers).map(id => ({
    id: id,
    status: userStatus[id] || 'idle'
  }));
  io.emit('online-users-list', usersList);
}

io.on('connection', (socket) => {
  // 🚨 حالا ما منتظر می‌مونیم تا کاربر آیدی خودش رو (از حافظه گوشیش) بفرسته
  socket.on('register-user', (shortId) => {
    // اگر این آیدی قبلا آنلاین بوده (مثلا دو تا تب باز کرده)، قطعش می‌کنیم
    if (onlineUsers[shortId]) {
        // اینجا می‌تونیم به کاربر قبلی پیام بدیم که یه جای دیگه لاگین شده
    }
    
    onlineUsers[shortId] = socket.id;
    userStatus[shortId] = 'idle';
    socket.join(shortId);
    socket.shortId = shortId; // ذخیره در سوکت برای استفاده در قطع اتصال
    
    socket.emit('your-id', shortId);
    broadcastOnlineUsers();
  });

  socket.on('request-connect', (opponentId) => {
    if (onlineUsers[opponentId] && userStatus[opponentId] === 'idle') {
      io.to(onlineUsers[opponentId]).emit('incoming-request', { from: socket.shortId });
    } else {
      socket.emit('error-msg', 'این کاربر الان در حال بازی است یا آفلاین شده.');
    }
  });

  socket.on('accept-connect', (requesterId) => {
    if (onlineUsers[requesterId]) {
      const roomId = `${requesterId}-${socket.shortId}`;
      socket.join(roomId);
      io.to(onlineUsers[requesterId]).socketsJoin(roomId);
      
      userStatus[requesterId] = 'playing';
      userStatus[socket.shortId] = 'playing';
      broadcastOnlineUsers();

      rooms[roomId] = { 
        requester: requesterId, 
        accepter: socket.shortId,
        currentTurn: requesterId 
      };
      
      io.to(onlineUsers[requesterId]).emit('game-started', { requester: requesterId, turn: requesterId });
      socket.emit('game-started', { requester: requesterId, turn: requesterId });
    }
  });

  socket.on('reject-connect', (requesterId) => {
    if (onlineUsers[requesterId]) {
      io.to(onlineUsers[requesterId]).emit('request-rejected');
    }
  });

  socket.on('dice-rolled', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('opponent-dice', data);
        break;
      }
    }
  });

  socket.on('make-move', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('opponent-move', data);
        break;
      }
    }
  });

  socket.on('end-turn', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        if (data && data.winner) {
            io.to(roomId).emit('game-over', { winner: socket.shortId });
            break;
        }
        if (data && data.dice === 6) {
            io.to(onlineUsers[socket.shortId]).emit('turn-changed', { nextTurn: socket.shortId });
        } else {
            let next = (rooms[roomId].currentTurn === rooms[roomId].requester) ? rooms[roomId].accepter : rooms[roomId].requester;
            rooms[roomId].currentTurn = next;
            io.to(roomId).emit('turn-changed', { nextTurn: next });
        }
        break;
      }
    }
  });

  socket.on('webrtc-signal', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('webrtc-signal', data);
        break;
      }
    }
  });

  socket.on('disconnect', () => {
    const shortId = socket.shortId;
    if (shortId) {
        for (const roomId in rooms) {
          if (roomId.includes(shortId)) {
            socket.to(roomId).emit('opponent-disconnected');
            let otherUser = roomId.split('-').find(id => id !== shortId);
            if (otherUser && userStatus[otherUser]) {
              userStatus[otherUser] = 'idle';
            }
            delete rooms[roomId];
          }
        }
        delete onlineUsers[shortId];
        delete userStatus[shortId];
        broadcastOnlineUsers();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
