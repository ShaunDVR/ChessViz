const Chess = require("chess.js").Chess;

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "https://chessviz.onrender.com",
  },
});

const port = 4000;

app.use(express.json());

app.get("/api/move", (req, res) => {
  res.send("Hello there");
});

app.post("/api/move", (req, res) => {
  // Handle move logic here
});

// Store the game states for each client
const gameStates = new Map();

io.on("connection", (socket) => {
  let color;
  console.log("A user connected");

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    // Remove the game state of the disconnected client
    gameStates.delete(socket.id);
  });

  socket.on("gameStart", (initialGameState) => {
    const gameState = new Chess(initialGameState);
    color = "w";
    // Store the game state for the client
    gameStates.set(socket.id + "room", gameState);
    socket.join(socket.id + "room");
    socket.emit("newGameStart", socket.id);
    socket.emit("colorSet", "w");
  });

  socket.on("requestJoinGame", async (gameId, callback) => {
    console.log(gameId, gameStates.get(gameId + "room"));
    let gameState = "";
    try {
      gameState = gameStates.get(gameId + "room");
    } catch {
      callback({
        ErrMsg: "No room found with given roomId",
      });
      console.log("Game state not found for the requested game");
      return;
    }
    let clients = await io.in(gameId + "room").fetchSockets();
    if (clients.length < 2) {
      color = "b";
      socket.join(gameId + "room");
      io.to(gameId + "room").emit("roomJoin", gameId);
      socket.emit("colorSet", "b");
      gameStates.set(gameId + "room", new Chess());
      io.to(gameId + "room").emit("gameReset");
    } else {
      color = "X";
      socket.join(gameId + "room");
      io.to(gameId + "room").emit("roomJoin", gameId);
      socket.emit("colorSet", "X");
    }
  });

  socket.on("switchColor", (roomId) => {
    console.log(roomId);
    const gameState = gameStates.get(roomId + "room");
    if (!gameState) {
      console.log("Game state not found for the client");
      return;
    }
    if (
      gameState.fen() ==
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    ) {
      io.to(roomId + "room").emit("colorSwitch");
    }
  });

  socket.on("moveMade", (msg) => {
    const gameState = gameStates.get(msg.roomId + "room");
    if (!gameState) {
      console.log("Game state not found for the client");
      return;
    }

    try {
      gameState.move(msg.move);
      console.log(msg.move);
      console.log(gameState.ascii());
      // Broadcast the updated game state to all clients in the same room
      io.to(msg.roomId + "room").emit("moveResponse", {
        success: true,
        message: "Move executed successfully",
        gameState: gameState.fen(),
        move: msg.move,
      });
    } catch (error) {
      console.log(error);
    }
  });

  socket.on("messageSent", async (msg, room) => {
    console.log(msg, room);
    const gameRoom = gameStates.get(room + "room");
    if (!gameRoom) {
      console.log("huh");
      return {
        error: "No Game Found",
        message: "User is not currently part of a room",
      };
    }
    //Why do I have to do this? Why doesn't socket.to work like in documentation?
    let clients = await io.in(room + "room").fetchSockets();
    clients.forEach((user) => {
      if (user.id != socket.id) {
        console.log("socket sent to", user.id, "msg sent by", socket.id);
        io.to(user.id).emit("messageRecieved", msg);
      }
    });
  });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
