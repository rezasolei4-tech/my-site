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

// تابعی برای ارسال لیست کاربران آنلاین به همه
function broadcastOnlineUsers() {
  const usersList = Object.keys(onlineUsers).map(id => ({
    id: id,
    status: userStatus[id] || 'idle'
  }));
  io.emit('online-users-list', usersList);
}

io.on('connection', (socket) => {
  
  // 🚨 ثبت کاربر با آیدی ثابت
  socket.on('register-user', (shortId) => {
    // اگر این آیدی قبلا آنلاین بوده، اتصالش رو قطع می‌کنیم تا دوباره وصل بشه
    if (onlineUsers[shortId]) {
        const oldSocketId = onlineUsers[shortId];
        io.sockets.sockets.get(oldSocketId)?.disconnect();
    }
    
    onlineUsers[shortId] = socket.id;
    userStatus[shortId] = 'idle';
    socket.join(shortId);
    socket.shortId = shortId; 
    
    socket.emit('your-id', shortId);
    broadcastOnlineUsers();
  });

  // درخواست اتصال
  socket.on('request-connect', (opponentId) => {
    if (onlineUsers[opponentId] && userStatus[opponentId] === 'idle') {
      io.to(onlineUsers[opponentId]).emit('incoming-request', { from: socket.shortId });
    } else {
      socket.emit('error-msg', 'این کاربر الان در حال بازی است یا آفلاین شده.');
    }
  });

  // قبول درخواست
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

  // رد درخواست
  socket.on('reject-connect', (requesterId) => {
    if (onlineUsers[requesterId]) {
      io.to(onlineUsers[requesterId]).emit('request-rejected');
    }
  });

  // تاس
  socket.on('dice-rolled', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('opponent-dice', data);
        break;
      }
    }
  });

  // حرکت مهره
  socket.on('make-move', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('opponent-move', data);
        break;
      }
    }
  });

  // پایان نوبت
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

  // WebRTC (تماس تصویری)
  socket.on('webrtc-signal', (data) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('webrtc-signal', data);
        break;
      }
    }
  });

  // چت متنی
  socket.on('chat-message', (text) => {
    for (const roomId in rooms) {
      if (roomId.includes(socket.shortId)) {
        socket.to(roomId).emit('chat-message', text);
        break;
      }
    }
  });

  // قطع اتصال
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
