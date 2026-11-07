// دریافت دستور پایان نوبت
socket.on('end-turn', () => {
  for (const roomId in rooms) {
    if (roomId.includes(shortId)) {
      // تغییر نوبت
      rooms[roomId].currentTurn = (rooms[roomId].currentTurn === shortId) ? rooms[roomId].accepter : rooms[roomId].requester;
      // ارسال به همه در اتاق که نوبت عوض شد
      io.to(roomId).emit('turn-changed', { nextTurn: rooms[roomId].currentTurn });
      break;
    }
  }
});
