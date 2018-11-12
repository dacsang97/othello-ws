const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { initGame } = require("./controller/game");

const app = express();

const server = http.createServer(app);
const io = socketIO(server, { origins: "*:*" });
server.listen(3000);

io.sockets.on("connection", function(socket) {
  initGame(io, socket);
});
