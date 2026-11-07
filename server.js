const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// لیست کاربرانی که آنلاین هستند
let onlineUsers = {};

io.on('connection', (socket) => {
  // ساخت یک آیدی کوتاه ۴ رقمی تصادفی
  let shortId = Math.floor(1000 + Math.random() * 9000).toString();
  
  // اطمینان از تکراری نبودن آیدی
  while (onlineUsers[shortId]) {
    shortId = Math.floor(1000 + Math.random() * 9000).toString();
  }

  // ذخیره کاربر با آیدی کوتاه و اتصال سوکت
  onlineUsers[shortId] = socket.id;
  socket.join(shortId); // کاربر وارد اتاق خودش می‌شود

  // فرستادن آیدی کوتاه به کاربر
  socket.emit('your-id', shortId);

  // وقتی کاربر می‌خواهد به حریف وصل شود
  socket.on('request-connect', (opponentId) => {
    if (onlineUsers[opponentId]) {
      // درخواست رو به حریف می‌فرستیم
      io.to(onlineUsers[opponentId]).emit('incoming-request', { from: shortId });
    } else {
      socket.emit('error-msg', 'کاربر مورد نظر آنلاین نیست.');
    }
  });

  // وقتی حریف درخواست رو قبول می‌کند
  socket.on('accept-connect', (requesterId) => {
    if (onlineUsers[requesterId]) {
      // هر دو نفر رو به یک اتاق مشترک می‌بریم
      const roomId = `${requesterId}-${shortId}`;
      socket.join(roomId);
      io.to(onlineUsers[requesterId]).socketsJoin(roomId);
      
      // به هر دو نفر اعلام شروع بازی
      io.to(roomId).emit('game-started', { room: roomId });
    }
  });

  socket.on('disconnect', () => {
    // پاک کردن کاربر از لیست آنلاین
    delete onlineUsers[shortId];
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
