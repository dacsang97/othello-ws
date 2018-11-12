let io;
let gameSocket;
let rooms = [];
let pwd = {};

exports.initGame = function(sio, socket) {
  io = sio;
  gameSocket = socket;
  gameSocket.emit("connected", {
    message: "You are connected!",
    rooms
  });

  io.emit("updateListRooms", {
    rooms
  });

  gameSocket.on("hostCreateNewGame", hostCreateNewGame);
  gameSocket.on("disconnect", onDisconnect);
  gameSocket.on("getInfo", () => {
    gameSocket.emit("connected", {
      message: "You are connected!",
      rooms
    });
  });
  // Player Events
  gameSocket.on("playerJoinGame", playerJoinGame);
  gameSocket.on("newMove", newMove);
  gameSocket.on("surrender", surrender);
  gameSocket.on("exit", exitRoom);
  gameSocket.on("gameOver", gameOver);
};

function onDisconnect() {
  rooms = rooms.filter(room => room.players[0].id !== this.id);
  io.emit("updateListRooms", {
    rooms
  });
}

function exitRoom(data) {
  io.sockets.in(data.gameId).emit("exit");
}

function surrender(data) {
  const room = rooms.find(room => room.id === data.gameId);

  io.sockets.in(data.gameId).emit("surrender", {
    win: room.players[data.win - 1].name
  });
}

function hostCreateNewGame(data) {
  // Create a unique Socket.IO Room
  let thisGameId = (Math.random() * 10000000) | 0;
  let password = false;

  if (data.password) {
    password = true;
    pwd[thisGameId] = data.password;
  }

  rooms.push({
    id: thisGameId,
    password,
    players: [
      {
        id: this.id,
        name: data.name
      }
    ]
  });

  // Return the Room ID (gameId) and the socket ID (mySocketId) to the browser client
  this.emit("newGameCreated", {
    gameId: thisGameId,
    socketId: this.id,
    ...data
  });

  // Join the Room and wait for the players
  this.join(thisGameId.toString());
  io.emit("updateListRooms", {
    rooms
  });
}

function playerJoinGame(data) {
  console.log(
    "Player " + data.name + " attempting to join game: " + data.gameId
  );

  // A reference to the player's Socket.IO socket object
  // let sock = this

  // If the room exists
  let roomIds = rooms.map(room => room.id);
  console.log(roomIds);
  if (roomIds.includes(data.gameId)) {
    console.log("Room is found.");

    const room = rooms.find(room => room.id === data.gameId);
    const playerNum = room.players.length;
    const inRoom = room.players.map(player => player.id).includes(this.id);

    if (inRoom) {
      return this.emit("inRoom");
    }

    if (pwd[data.gameId]) {
      if (!data.password)
        return this.emit("errMess", { message: "Room require password" });
      if (pwd[data.gameId] !== data.password)
        return this.emit("errMess", { message: "Wrong password" });
    }

    if (playerNum !== 2) {
      this.join(data.gameId);
      console.log(
        "Player " + data.playerName + " joining game: " + data.gameId
      );
      const player = {
        id: this.id,
        name: data.name
      };
      room.players.push(player);
      // remove all room this created
      const listR = rooms.filter(room => room.players[0].id === this.id);
      listR.forEach(room => {
        this.leave(room.id);
      });
      rooms = rooms.filter(room => room.players[0].id !== this.id);
      io.emit("updateListRooms", {
        rooms
      });
      io.sockets.in(data.gameId).emit("playerJoinedRoom", room);
    } else {
      this.emit("errMess", { message: "This room is full" });
    }
  } else {
    this.emit("errMess", { message: "This room does not exist." });
  }
}

function newMove(data) {
  console.log("Received Move with data: ");
  console.log(data);
  io.sockets.in(data.gameId).emit("newMove", data);
}

function gameOver(data) {
  const room = rooms.find(room => room.id === data.gameId);
  if (data.tie) {
    io.sockets.in(data.gameId).emit("gameOver", {
      tie: true
    });
  } else {
    io.sockets.in(data.gameId).emit("gameOver", {
      win: room.players[data.win - 1].name
    });
  }
}
