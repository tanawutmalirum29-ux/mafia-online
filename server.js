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
const wolfRoles = [
    "หมาป่า",
    "ลูกหมาป่า",
    "หมาป่าพิทักษ์",
    "หมาป่าดื้อรั้น",
    "หมาป่านักเวท",
    
];
const roleMessages = {

    "หมอ":[
        "การป้องปกของคุณได้ช่วยคนไว้",
    ],
    "บอดี้การ์ด":[
        "เมื่อคืนคุณถูกโจมตี หากถูกอีกครั้งคุณจะตาย",
    ],

    "ผู้มีลาง":[
        "คนนี้เป็นฝ่ายดี",
        "คนนี้เป็นฝ่ายร้าย"
    ],


};
const roleDescription = {

    "หมอ": {
        title: "🩺 หมอ",
        desc: "คุณสามารถป้องปกคนได้ 1 คนให้รอดจากการถูกฆ่า แต่จะไม่สามารถปกป้องตัวเองได้"
    },

    "เซียร์": {
        title: "🔮 ผู้มีลาง",
        desc: "เลือก 1 คนต่อคืนเพื่อดูว่าเป็นฝ่ายดีหรือฝ่ายร้าย"
    },

    "หมาป่า": {
        title: "🐺 หมาป่า",
        desc: "ร่วมกันเลือกเหยื่อในกลุ่มหมาป่า และล่าในตอนกลางคืน"
    },

    "ลูกหมาป่า": {
        title: "🐺 ลูกหมาป่า",
        desc: "คุณสามารถเลือกเป้าหมายไว้ได้ หากคุณตายคนที่คุณเลือกไว้จะตายตามไปด้วย"
    },

    "หมาป่าพิทักษ์": {
        title: "🐺 หมาป่าพิทักษ์",
        desc: "คุณสามารถปกป้องหมาป่า จากการถูกโหวตประหารได้1ครั้ง"
    },
    "หมาป่าดื้อรั้น": {
        title: "🐺 หมาป่าดื้อรั้น",
        desc: "คุณมี2ชีวิต"
    },
    "หมาป่านักเวท": {
        title: "🐺 หมาป่าพิทักษ์",
        desc: "ร่ายเวทได้1คนต่อคืน หากอาชีพลางสังหรณ์มาส่องจะพบว่าคนนั้นอยู่ทีมหมาป่า"
    },

    "นักล่าหัว": {
        title: "🎯 นักล่าหัว",
        desc: "หากเป้าหมายถูกโหวตประหาร คุณจะชนะ แต่ถ้าหากเป้าหมายคุณตายด้วยวิธีอื่น คุณจะชนะพร้อมกับสัมพันธมิตรฝ่ายร้าย"
    },

    "ชาวบ้าน": {
        title: "👤 ชาวบ้าน",
        desc: "ไม่มีพลังพิเศษ ใช้การโหวตเพื่อหาหมาป่า"
    },
     "ยายแก่": {
        title: "👵 ยายแก่",
        desc: "ทำให้คน1คนเป็นใบ้"
    },
    
       "แม่มด": {
        title: "🧙‍♀️ แม่มด",
        desc: "คุณมียาพิษ และ ยาป้องกัน อย่างละขวด ยาป้องกันจะหมดก็ต่อเมื่อคุณป้องกันสำเร็จ"
    },

    "บอดี้การ์ด": {
        title: "🛡️ บอดี้การ์ด",
        desc: "ป้องกัน 1 คนต่อคืน และปกป้องตัวเองอัตโนมัติ หากการปกป้องคุณถูกโจมตีการโจมตีราั้งถักไปครั้งถัดไปคุณจะตาย"
    },
     "ศาลเตี้ย": {
        title: "🔫 ศาลเตี้ย",
        desc: "คุณมีกระสุน1นัด และสามารถดูบทบาทคนได้1คน เห็นเฉพาะคุณเท่านั้น"
    },

    "คนบ้า": {
        title: "🤪 คนบ้า",
        desc: "ถูกโหวตประหารเพื่อขนะ"
    },
     "ฆาตกร": {
        title: "🗡️ ฆาตกร",
        desc: "สามารถฆ่าผู้เล่นได้ 1 คนต่อคืน หมาป่าฆ่าคุณไม่ได้"
    }

};

function genId() {

    return Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

}

// SHUFFLE
function shuffle(arr) {

    for (
        let i = arr.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random()
                * (i + 1)
            );

        [
            arr[i],
            arr[j]
        ] = [
            arr[j],
            arr[i]
        ];

    }

    return arr;

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
    selectedTargets: {},
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
                "บอดี้การ์ด"
            ],
 
             "สุ่มชาวบ้านสนับสนุน": [
                "ศาลเตี้ย",
                "แม่มด",
            ],

            "สุ่มหมาป่า": [
                "หมาป่า",
                "ลูกหมาป่า",
                "หมาป่าดื้อรั้น",
               
            ],
             "สุ่มหมาป่าสนับสนุน": [
                "หมาป่าพิทักษ์",
                "หมาป่านักเวท",
               
            ],

            "สุ่มบทบาทการโหวต": [
                "คนบ้า",
                "นักล่าหัว",
               
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
// บทที่ล่าไม่ได้
const cannotBeHuntedRoles = [
    "หมาป่า",
    "ลูกหมาป่า",
    "หมาป่าดื้อรั้น",
    "หมาป่าพิทักษ์",
    "หมาป่านักเวท",
    "คนบ้า",
    "นักล่าหัว",
    "ฆาตกร",
    "ศาลเตี้ย",

];

// RANDOM HUNT TARGET
realPlayers.forEach((p) => {

    // เฉพาะนักล่า
    if (
        p.role !== "นักล่าหัว"
    ) return;

    // เป้าหมายที่ล่าได้
    const targets =
        realPlayers.filter(
            x =>

            x.id !== p.id &&

            !cannotBeHuntedRoles.includes(
                x.role
            )
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

    // เก็บทั้ง id และชื่อ
    p.huntTargetId =
        randomTarget.id;

    p.huntTarget =
        randomTarget.name;

});

// SEND ROLE
realPlayers.forEach((p) => {

    io.to(p.id).emit(
    "your_role",
    {
        role: p.role,
        displayRole: p.displayRole,
        huntTarget: p.huntTarget,
        roleInfo: roleDescription[p.role] || null
    }
);

});
room.started = true;

io.to(roomId).emit("room_update", {
    ...room,
    selectedTargets: room.selectedTargets || {}
});
});

    // TOGGLE STATE
    socket.on(
    "toggle_state",
    ({
        roomId,
        playerId,
        key,
        value
    }) => {

    const room = rooms[roomId];
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player) return;

    player[key] = value;

    io.to(roomId).emit("room_update", room);
});

socket.on("select_target", ({ roomId, targetId }) => {

    const room = rooms[roomId];
    if (!room) return;

    if (!room.selectedTargets) room.selectedTargets = {};

    room.selectedTargets[socket.id] = targetId;

    const payload = {
        from: socket.id,
        targetId
    };

    // ส่งให้ host + ทุกคน (debug / sync)
    io.to(roomId).emit("selection_update", {
    from: socket.id,
    targetId,
    targetName: target.name
});
});
    // =========================
    // SEND CHAT
    // =========================
    socket.on("send_chat", ({ roomId, text, type }) => {

        const room = rooms[roomId];
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        if (typeof text !== "string") return;

        const msg = text.trim();
        if (msg.length === 0 || msg.length > 200) return;

        if (!player.alive) return;

        const isWolf = wolfRoles.includes(player.role);

        // WOLF CHAT
        if (type === "wolf") {

            if (!isWolf) return;

            room.players.forEach(p => {
                if (wolfRoles.includes(p.role)) {
                    io.to(p.id).emit("chat_message", {
                        name: player.name,
                        text: msg,
                        type: "wolf"
                    });
                }
            });

            return;
        }

        // GLOBAL CHAT
        io.to(roomId).emit("chat_message", {
            name: player.name,
            text: msg,
            type: "global"
        });
    });

    // =========================
    // HOST CHAT
    // =========================
    socket.on("host_chat", ({ roomId, text, type }) => {

        const room = rooms[roomId];
        if (!room) return;

        if (socket.id !== room.host) return;

        if (typeof text !== "string") return;

        const msg = text.trim();
        if (!msg) return;

        const isWolfChat = type === "wolf";

        if (isWolfChat) {

            room.players.forEach(p => {
                if (wolfRoles.includes(p.role)) {
                    io.to(p.id).emit("chat_message", {
                        name: "HOST",
                        text: msg,
                        type: "wolf",
                        isHost: true
                    });
                }
            });

            return;
        }

        io.to(roomId).emit("chat_message", {
            name: "HOST",
            text: msg,
            type: "global",
            isHost: true
        });

    });

    // =========================
    // PRIVATE HOST MSG
    // =========================
    socket.on("host_private_msg", ({ roomId, playerId, text }) => {

        const room = rooms[roomId];
        if (!room) return;

        if (socket.id !== room.host) return;

        const player = room.players.find(p => p.id === playerId);
        if (!player) return;

        if (typeof text !== "string") return;

        const msg = text.trim();
        if (!msg) return;

        const presets = roleMessages[player.role] || [];
        if (!presets.includes(msg)) return;

        io.to(player.id).emit("chat_message", {
            name: "HOST",
            text: msg,
            type: "private",
            isHost: true
        });
    });

    // =========================
    // DISCONNECT (FIXED CLEANUP)
    // =========================
    socket.on("disconnect", () => {

        for (const id in rooms) {

            const room = rooms[id];

            room.players =
                room.players.filter(p => p.id !== socket.id);

            // cleanup room empty
            if (room.players.length === 0) {
                delete rooms[id];
                continue;
            }

            // reassign host if needed
            if (room.host === socket.id && room.players.length > 0) {
                room.host = room.players[0].id;
                room.players[0].isHost = true;
            }

            io.to(id).emit("room_update", room);
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