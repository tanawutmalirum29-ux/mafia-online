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
const roles = {
  "หมาป่า": {
    team: "wolf",
    score: 2,
    messages: []
  },

"ลูกหมาป่า": {
    team: "wolf",
    score: 4,
    messages: ["จะลากใครคลิ๊กไว้"]
  },
"หมาป่าพิทักษ์": {
    team: "wolf",
    score: 3,
    messages: ["ปกป้องหมาตัวไหนคลิ๊กเลย"]
  },

 "หมาป่าดื้อรั้น": {
    team: "wolf",
    score: 3,
    messages: ["คุณได้รับบาดเจ็บ หากถูกโจมตีอีกครั้งคุณจะตาย"]
  },

"หมาป่านักเวท": {
    team: "wolf",
    score: 4,
    messages: ["ร่ายเวทย์ใส่ใครกดคลิ๊ก"]
  },


  "ชาวบ้าน": {
    team: "villager",
    score: 3,
    messages: [
      "ไอไก่",
    ]
  },
 "ผู้ถูกสาป": {
    team: "villager",
    score: 3,
    messages: [
      "คุณได้กลายเป็นหมาป่าแล้ว",
    ]
  },

  "หมอ": {
    team: "villager",
    score: 3,
    messages: [
      "การป้องกันของคุณช่วยชีวิตผู้เล่น"
    ]
  },

  "บอดี้การ์ด": {
    team: "villager",
    score: 3,
    messages: [
      "เมื่อคืนคุณถูกโจมตี หากถูกอีกครั้งจะตาย"
    ]
  },
"นักกล้าม": {
    team: "villager",
    score: 3,
    messages: [
      "คุณถูกโจมตี"
    ]
  },

"ผู้มีลาง": {
    team: "villager",
    score: 3,
    messages: [
      "คนนี้เป็นฝ่ายดี",
      "คนนี้เป็นฝ่ายร้าย",
      "ไม่ทราบฝ่าย"
    ]
  },
"ยายแก่": {
    team: "villager",
    score: 3,
    messages: [
      "ใบ้ใครคลิ๊กเลย",
    ]
  },
"แม่มด": {
    team: "villager",
    score: 3,
    messages: [
     "เลือกยาป้องกันใส่ใครคลิ๊กเลย",
     "โยนยาพิษใส่ใครคลิ๊กเลย"
    ]
  },
"ศาลเตี้ย": {
    team: "villager",
    score: 3,
    messages: [
    ]
  },

"คนบ้า": {
    team: "solo",
    score: 2,
    messages: []
  },

  "นักล่าหัว": {
    team: "solo",
    score: 4,
    messages: []
  },

  "ฆาตกร": {
    team: "solo",
    score: 4,
    messages: []
  },

};
function broadcastRoles() {
  io.emit("roles_data", roles);
}

io.on("connection", (socket) => {
  socket.emit("roles_data", roles);
});

const wolfRoles = Object.keys(roles).filter(
    role => roles[role].team === "wolf"
);

const roleDescription = {

"หมาป่า": {
        title: "🐺 หมาป่า",
        desc: "ร่วมกันเลือกเหยื่อในกลุ่มหมาป่า และล่าในตอนกลางคืน  ลาง:ร้าย"
    },

    "ลูกหมาป่า": {
        title: "🐺 ลูกหมาป่า",
        desc: "คุณสามารถเลือกเป้าหมายไว้ได้ หากคุณตายคนที่คุณเลือกไว้จะตายตามไปด้วย  ลาง:รัาย"
    },

    "หมาป่าพิทักษ์": {
        title: "🐺 หมาป่าพิทักษ์",
        desc: "คุณสามารถปกป้องหมาป่า จากการถูกโหวตประหารได้1ครั้ง  ลาง:ร้าย"
    },
    "หมาป่าดื้อรั้น": {
        title: "🐺 หมาป่าดื้อรั้น",
        desc: "คุณมี2ชีวิต  ลาง:ไม่ทราบ"
    },
    "หมาป่านักเวท": {
        title: "🐺 หมาป่าพิทักษ์",
        desc: "ร่ายเวทได้1คนต่อคืน หากอาชีพลางสังหรณ์มาส่องจะพบว่าคนนั้นอยู่ทีมหมาป่า  ลาง:ร้าย"
    },

"ชาวบ้าน": {
        title: '<img src="/images/village.jpg" width="30"> ชาวบ้าน',
        desc: "ไม่มีพลังพิเศษ ใช้การโหวตเพื่อหาหมาป่า  ลาง:ดี"
    },
"ผู้ถูกสาป": {
        title: '<img src="/images/cursed.png" width="30"> ผู้ถูกสาป',
        desc: "คุณอยู่ทีมชาวบ้าน แต่ถ้าหากคุณถูกหมาป่ากัด คุณจะกลายเป็นหมาป่า  ลาง:ดีหรือร้าย"
    },

    "หมอ": {
        title: '<img src="/images/doctor.jpg" width="30"> หมอ',
        desc: "คุณสามารถป้องปกคนได้ 1 คนให้รอดจากการถูกฆ่า แต่จะไม่สามารถปกป้องตัวเองได้  ลาง:ดี"
     },
"บอดี้การ์ด": {
        title: '<img src="/images/bodyguard.jpg" width="30"> บอดี้การ์ด',
        desc: "ป้องกัน 1 คนต่อคืน และปกป้องตัวเองอัตโนมัติ หากการปกป้องคุณถูกโจมตีการโจมตีครั้งถัดไปคุณจะตาย  ลาง:ดี"
    },

"นักกล้าม": {
        title: "💪 นักกล้าม",
        desc: "ป้องกัน 1 คนต่อคืน และปกป้องตัวเองอัตโนมัติ หากการปกป้องคุณถูกโจมตีจะเปิดเผยบทบาทผู้ที่โจมตีคุณและคุณจะตายหลังการประชุม  ลาง:ดี"
    },

    "ผู้มีลาง": {
        title: '<img src="/images/auraseer" width="30"> ผู้มีลาง',
        desc: "เลือก 1 คนต่อคืนเพื่อดูว่าเป็นฝ่ายดีหรือฝ่ายร้าย ลาง:ดี"
    },

     "ยายแก่": {
        title: "👵 ยายแก่",
        desc: "ทำให้คน1คนเป็นใบ้  ลาง:ดี"
    },
    
       "แม่มด": {
        title: "🧙‍♀️ แม่มด",
        desc: "คุณมียาพิษ และ ยาป้องกัน อย่างละขวด ยาป้องกันจะหมดก็ต่อเมื่อคุณป้องกันสำเร็จ  ลาง:ไม่ทราบ"
    },

    
     "ศาลเตี้ย": {
        title: "🔫 ศาลเตี้ย",
        desc: "คุณมีกระสุน1นัด และสามารถดูบทบาทคนได้1คน เห็นเฉพาะคุณเท่านั้น  ลางไม่ทราบ"
    },

    
    "นักล่าหัว": {
        title: '<img src="/images/headhunter.jpg" width="30"> นักล่าหัว',
        desc: "หากเป้าหมายถูกโหวตประหาร คุณจะชนะ แต่ถ้าหากเป้าหมายคุณตายด้วยวิธีอื่น คุณจะชนะพร้อมกับสัมพันธมิตรฝ่ายร้าย  ลาง:ไม่ทราบ"
    },

    

    "คนบ้า": {
        title: '<img src="/images/fool.jpg" width="30"> คนบ้า',
        desc: "ถูกโหวตประหารเพื่อขนะ  ลาง:ไม่ทราบ"
    },
     "ฆาตกร": {
        title: "🗡️ ฆาตกร",
        desc: "สามารถฆ่าผู้เล่นได้ 1 คนต่อคืน หมาป่าฆ่าคุณไม่ได้   ลาง:ไม่ทราบ"
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

const cannotBeHuntedTeams = ["wolf", "solo"];

const cannotBeHuntedRoles = ["ศาลเตี้ย"];

realPlayers.forEach((p) => {

    if (!roles) return;

    if (p.role !== "นักล่าหัว") return;

    const targets = realPlayers.filter((x) => {

        if (x.id === p.id) return false;

        const roleData = roles?.[x.role] || {};

        if (cannotBeHuntedTeams.includes(roleData.team)) {
            return false;
        }

        if (cannotBeHuntedRoles.includes(x.role)) {
            return false;
        }

        return true;
    });

    if (targets.length === 0) {
        p.huntTargetId = null;
        p.huntTarget = null;
        return;
    }

    const randomTarget =
        targets[Math.floor(Math.random() * targets.length)];

    p.huntTargetId = randomTarget.id;
    p.huntTarget = randomTarget.name;
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
room.justStarted = true;

io.to(roomId).emit("room_update", room);

// ล้าง justStarted ทันทีหลังส่ง เพื่อไม่ให้ update ถัดไปล้างแชทซ้ำ
room.justStarted = false;
    
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

    // TOGGLE VOTE MODE
    socket.on("toggle_vote_mode", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (socket.id !== room.host) return;

        room.voteMode = !room.voteMode;

        if (!room.voteMode) {
            room.votes = {};
        }

        io.to(roomId).emit("room_update", room);
    });

    // CAST VOTE
    socket.on("cast_vote", ({ roomId, targetId }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (!room.voteMode) return;

        const voter = room.players.find(p => p.id === socket.id);
        if (!voter || !voter.alive || voter.isHost) return;

        if (!room.votes) room.votes = {};

        if (!targetId) {
            delete room.votes[socket.id];
        } else {
            if (targetId === socket.id) return;
            const target = room.players.find(p => p.id === targetId);
            if (!target || !target.alive) return;
            room.votes[socket.id] = targetId;
        }

        io.to(roomId).emit("room_update", room);
    });

socket.on("select_target", ({ roomId, targetId }) => {

    const room = rooms[roomId];
    if (!room) return;

    if (!room.selectedTargets) room.selectedTargets = {};

    // ถ้า null = ยกเลิกการเลือก
    if (!targetId) {
        delete room.selectedTargets[socket.id];
    } else {

        if (targetId === socket.id) return;

        const targetPlayer = room.players.find(p => p.id === targetId);
        if (!targetPlayer || !targetPlayer.alive) return;

        room.selectedTargets[socket.id] = targetId;
    }

    io.to(roomId).emit("room_update", room);
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
                if (wolfRoles.includes(p.role) || p.id === room.host) {
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
                if (wolfRoles.includes(p.role) || p.id === room.host) {
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

        const presets = roles[player.role]?.messages || [];
        if (!presets.includes(msg)) return;

        io.to(player.id).emit("chat_message", {
            name: "HOST",
            text: msg,
            type: "private",
            isHost: true
        });

        // ส่งสำเนาให้โฮสต์เห็นด้วย (ถ้าโฮสต์ไม่ใช่ผู้รับ)
        if (socket.id !== player.id) {
            io.to(room.host).emit("chat_message", {
                name: `HOST → ${player.name}`,
                text: msg,
                type: "private",
                isHost: true
            });
        }

        // ผู้ถูกสาป ที่ได้รับข้อความ "กลายเป็นหมาป่า" จะย้ายทีมไปหมาป่า
        if (
            player.role === "ผู้ถูกสาป" &&
            msg === "คุณได้กลายเป็นหมาป่าแล้ว"
        ) {
            player.role = "หมาป่า";
            player.displayRole = "หมาป่า (ผู้ถูกสาป)";

            io.to(player.id).emit("your_role", {
                role: player.role,
                displayRole: player.displayRole,
                huntTarget: player.huntTarget,
                roleInfo: roleDescription[player.role] || null
            });

            io.to(roomId).emit("room_update", room);
        }
    });


    socket.on("disconnect", () => {

        for (const id in rooms) {

            const room = rooms[id];

            const wasHost = room.host === socket.id;

            room.players =
                room.players.filter(p => p.id !== socket.id);

            // ถ้าโฮสต์หลุด/รีห้อง -> ปิดห้องทันที แจ้งผู้เล่นทุกคนให้กลับหน้าหลัก
            if (wasHost) {
                io.to(id).emit("room_closed", {
                    reason: "host_disconnected"
                });

                for (const p of room.players) {
                    io.sockets.sockets.get(p.id)?.leave(id);
                }

                delete rooms[id];
                continue;
            }

            // cleanup room empty
            if (room.players.length === 0) {
                delete rooms[id];
                continue;
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