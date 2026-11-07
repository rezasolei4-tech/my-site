const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

let onlineUsers = {};
let rooms = {}; // برای نگه داشتن اطلاعات اتاق‌ها

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
    } else {
      socket.emit('error-msg', 'کاربر آنلاین نیست.');
    }
  });

  socket.on('accept-connect', (requesterId) => {
    if (onlineUsers[requesterId]) {
      const roomId = `${requesterId}-${shortId}`;
      socket.join(roomId);
      io.to(onlineUsers[requesterId]).socketsJoin(roomId);
      
      // ذخیره اطلاعات اتاق
      rooms[roomId] = { requester: requesterId, accepter: shortId };

      // به هر دو نفر بگو کی هستن تا نوبت‌ها مشخص بشه
      io.to(onlineUsers[requesterId]).emit('game-started', { room: roomId, requester: requesterId });
      socket.emit('game-started', { room: roomId, requester: requesterId });
    }
  });

  // دریافت حرکت از یک بازیکن و ارسال به حریف
  socket.on('make-move', (data) => {
    // پیدا کردن اتاقی که این کاربر در آن است
    for (const roomId in rooms) {
      if (roomId.includes(shortId)) {
        // ارسال حرکت به همه در اتاق به جز خود فرستنده
        socket.to(roomId).emit('opponent-move', data);
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
