const express = require('express');
const http = require('http');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('یک کاربر متصل شد:', socket.id);

  socket.on('join-game', (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit('opponent-joined', socket.id);
  });

  socket.on('make-move', (data) => {
    socket.to(data.roomId).emit('opponent-move', data.move);
  });

  socket.on('disconnect', () => {
    console.log('یک کاربر قطع شد');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`سرور روی پورت ${PORT} در حال اجراست`);
});
