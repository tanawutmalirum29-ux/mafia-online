const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

app.use(express.static("public"));

const rooms = {};

function genId() {

    return Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

}

// SHUFFLE
function shuffle(arr) {

    return arr.sort(
        () => Math.random() - 0.5
    );

}

io.on("connection", (socket) => {

    // CREATE ROOM
    socket.on(
        "create_room",
        ({ name }, cb) => {

        const id = genId();

        rooms[id] = {

            host: socket.id,

            config: {},

            started: false,

            players: [
                {
                    id: socket.id,

                    name: name,

                    isHost: true,

                    role: null,

                    displayRole: null,

                    alive: true,

                    protected: false,

                    killed: false
                }
            ]
        };

        socket.join(id);

        io.to(id).emit(
            "room_update",
            rooms[id]
        );

        cb(id);

    });

    // JOIN ROOM
    socket.on(
        "join_room",
        ({ roomId, name }, cb) => {

        roomId =
            roomId.toUpperCase();

        const room =
            rooms[roomId];

        if (!room) {

            return cb({
                error: "room not found"
            });

        }

        const already =
            room.players.find(
                p => p.id === socket.id
            );

        if (!already) {

            room.players.push({

                id: socket.id,

                name: name,

                isHost: false,

                role: null,

                displayRole: null,

                alive: true,

                protected: false,

                killed: false

            });

        }

        socket.join(roomId);

        io.to(roomId).emit(
            "room_update",
            room
        );

        cb({
            ok: true
        });

    });

    // UPDATE CONFIG
    socket.on(
        "update_config",
        ({ roomId, config }) => {

        const room =
            rooms[roomId];

        if (!room) return;

        room.config = config;

        io.to(roomId).emit(
            "room_update",
            room
        );

    });

    // START GAME
    socket.on(
        "start_game",
        (roomId) => {

        const room =
            rooms[roomId];

        if (!room) return;

        const roleCards = [];

        // RANDOM GROUPS
        const randomGroups = {

            "สุ่มชาวบ้าน": [
                "ชาวบ้าน",
                "หมอ",
                "เซียร์",
                "บอดี้การ์ด"
            ],

            "สุ่มหมาป่า": [
                "หมาป่า",
                "ลูกหมาป่า",
                "หมาป่าขาว"
            ],

            "สุ่มบทบาทการโหวต": [
                "คนบ้า",
                "นักล่า",
                "ผู้เฒ่า"
            ]

        };

        // BUILD ROLE CARDS
        Object.keys(room.config)
            .forEach((roleName) => {

            const count =
                room.config[roleName];

            for (
                let i = 0;
                i < count;
                i++
            ) {

                // RANDOM GROUP
                if (
                    randomGroups[roleName]
                ) {

                    const pool =
                        randomGroups[
                            roleName
                        ];

                    const realRole =
                        pool[
                            Math.floor(
                                Math.random()
                                * pool.length
                            )
                        ];

                    roleCards.push({

                        role: realRole,

                        displayRole:
                            `${roleName}/${realRole}`

                    });

                }

                // NORMAL ROLE
                else {

                    roleCards.push({

                        role: roleName,

                        displayRole:
                            roleName

                    });

                }

            }

        });

        const realPlayers =
            room.players.filter(
                p => !p.isHost
            );

        // CHECK ROLE COUNT
        if (
            roleCards.length !==
            realPlayers.length
        ) {

            io.to(room.host).emit(
                "host_error",
                `จำนวน role (${roleCards.length})
                ไม่เท่ากับจำนวนผู้เล่น
                (${realPlayers.length})`
            );

            return;

        }

        // SHUFFLE
        shuffle(roleCards);

        // ASSIGN
realPlayers.forEach((p, i) => {

    const card =
        roleCards[i];

    p.role =
        card.role;

    p.displayRole =
        card.displayRole;

    p.huntTarget = null;

});

// RANDOM HUNT TARGET
realPlayers.forEach((p) => {

    // เฉพาะนักล่า
    if (
        p.role !== "นักล่า"
    ) return;

    // เป้าหมายที่ล่าได้
    const targets =
        realPlayers.filter(
            x =>

            x.id !== p.id &&

            !x.cannotBeHunted
        );

    if (
        targets.length <= 0
    ) return;

    const randomTarget =
        targets[
            Math.floor(
                Math.random()
                * targets.length
            )
        ];

    p.huntTarget =
        randomTarget.id;

});

// SEND ROLE
realPlayers.forEach((p) => {

    io.to(p.id).emit(
        "your_role",
        {
            role: p.role,

            displayRole:
                p.displayRole,

            huntTarget:
                p.huntTarget
        }
    );

});

    // TOGGLE STATE
    socket.on(
        "toggle_state",
        ({
            roomId,
            playerId,
            key
        }) => {

        const room =
            rooms[roomId];

        if (!room) return;

        const player =
            room.players.find(
                p => p.id === playerId
            );

        if (!player) return;

        player[key] =
            !player[key];

        io.to(roomId).emit(
            "room_update",
            room
        );

    });

    // DISCONNECT
    socket.on(
        "disconnect",
        () => {

        for (
            const roomId
            in rooms
        ) {

            const room =
                rooms[roomId];

            room.players =
                room.players.filter(
                    p =>
                    p.id !== socket.id
                );

            io.to(roomId).emit(
                "room_update",
                room
            );

        }

    });

});

server.listen(
    process.env.PORT || 3000,
    () => {

        console.log(
            "server running"
        );

    }
);