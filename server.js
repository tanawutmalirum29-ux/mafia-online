const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

function genId() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {

  // create room
  socket.on("create_room", (cb) => {
    const id = genId();

    rooms[id] = {
      host: socket.id,
      players: [],
      config: {
        wolf: 1,
        doctor: 1,
        villager: 3
      },
      started: false
    };

    socket.join(id);
    cb(id);
  });

  // join room
  socket.on("join_room", ({ roomId, name }, cb) => {
    const room = rooms[roomId];
    if (!room) return cb({ error: "not found" });

    room.players.push({
      id: socket.id,
      name,
      role: null,
      alive: true
    });

    socket.join(roomId);

    io.to(roomId).emit("room_update", room);
    cb({ ok: true });
  });

  // update role config (host)
  socket.on("update_config", ({ roomId, config }) => {
    const room = rooms[roomId];
    if (!room) return;

    room.config = config;

    io.to(roomId).emit("room_update", room);
  });

  // start game = แจกบทตาม config
  socket.on("start_game", (roomId) => {
    const room = rooms[roomId];
    if (!room) return;

    const roles = [];

    for (let i = 0; i < room.config.wolf; i++) roles.push("หมาป่า");
    for (let i = 0; i < room.config.doctor; i++) roles.push("หมอ");

    while (roles.length < room.players.length) {
      roles.push("ชาวบ้าน");
    }

    roles.sort(() => Math.random() - 0.5);

    room.players.forEach((p, i) => {
      p.role = roles[i];
      io.to(p.id).emit("your_role", p.role);
    });

    room.started = true;

    io.to(roomId).emit("room_update", room);
  });

});

server.listen(process.env.PORT || 3000);