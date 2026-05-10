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

    // CREATE ROOM
    socket.on("create_room", ({ name }, cb) => {

        const id = genId();

        rooms[id] = {
            host: socket.id,

            players: [
                {
                    id: socket.id,
                    name: name,
                    role: "HOST",
                    alive: true,
                    protected: false,
                    killed: false
                }
            ],

            config: {
                wolf: 1,
                doctor: 1
            },

            started: false
        };

        socket.join(id);

        io.to(id).emit("room_update", rooms[id]);

        cb(id);

    });

    // JOIN ROOM
    socket.on("join_room", ({ roomId, name }, cb) => {

        const room = rooms[roomId];

        if (!room) {
            return cb({ error: "room not found" });
        }

        room.players.push({
            id: socket.id,
            name,
            role: null,
            alive: true,
            protected: false,
            killed: false
        });

        socket.join(roomId);

        io.to(roomId).emit("room_update", room);

        cb({ ok: true });

    });

    // UPDATE ROLE CONFIG
    socket.on("update_config", ({ roomId, config }) => {

        const room = rooms[roomId];

        if (!room) return;

        room.config = config;

        io.to(roomId).emit("room_update", room);

    });

    // START GAME
    socket.on("start_game", (roomId) => {

        const room = rooms[roomId];

        if (!room) return;

        const roles = [];

        for (let i = 0; i < room.config.wolf; i++) {
            roles.push("หมาป่า");
        }

        for (let i = 0; i < room.config.doctor; i++) {
            roles.push("หมอ");
        }

        const realPlayers = room.players.filter(
            p => p.role !== "HOST"
        );

        while (roles.length < realPlayers.length) {
            roles.push("ชาวบ้าน");
        }

        roles.sort(() => Math.random() - 0.5);

        realPlayers.forEach((p, i) => {

            p.role = roles[i];

            io.to(p.id).emit("your_role", p.role);

        });

        room.started = true;

        io.to(roomId).emit("room_update", room);

    });

    // TOGGLE STATE
    socket.on("toggle_state", ({ roomId, playerId, key }) => {

        const room = rooms[roomId];

        if (!room) return;

        const player = room.players.find(
            p => p.id === playerId
        );

        if (!player) return;

        player[key] = !player[key];

        io.to(roomId).emit("room_update", room);

    });

});

server.listen(process.env.PORT || 3000, () => {
    console.log("server running");
});