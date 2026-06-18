const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();

const server =
    http.createServer(app);

const io =
    new Server(server);

// maxAge: ให้เบราว์เซอร์ cache ไฟล์ static (รูปไอคอนอาชีพ ฯลฯ) ไว้ ไม่ต้องโหลดซ้ำทุกครั้งที่เจอ
// ช่วยให้รูปที่เคยโชว์ไปแล้วในหน้าอื่น/ตอนอื่นของเกม ขึ้นทันทีจาก cache ไม่ต้องรอโหลดใหม่
app.use(express.static("public", { maxAge: "7d" }));

const rooms = {};

// ระยะเวลาที่ยอม "รอ" ผู้เล่นที่หลุดการเชื่อมต่อก่อนเตะออกจากห้องจริง
// (กันกรณีเน็ตสะดุดแค่แป๊บเดียว / มือถือล็อกสกรีน / สลับแอป แล้ว socket หลุดชั่วครู่)
const RECONNECT_GRACE_MS = 20000;

// โฮสต์ใช้เวลารอเชื่อมต่อใหม่นานกว่าผู้เล่นทั่วไปเล็กน้อย เพราะถ้าโฮสต์ไม่กลับมาจริงๆ
// ห้องทั้งห้องจะถูกปิด (กระทบทุกคน) ไม่ใช่แค่ผู้เล่นคนเดียวหลุดออกจากเกม
const HOST_RECONNECT_GRACE_MS = 30000;

// เก็บ timer ของผู้เล่นที่กำลังรอถูกเตะ แยกไว้นอก room/player object เสมอ
// (ห้ามฝัง timer handle ไว้ใน room หรือ player เพราะ object พวกนั้นถูกส่งทั้งก้อนผ่าน
// io.emit("room_update", room) ซึ่งต้อง JSON-serialize ได้ ถ้ามี timer handle ติดไปจะพัง)
const pendingRemovals = {};

// เมื่อผู้เล่นเชื่อมต่อใหม่ด้วย socket id ใหม่ (เน็ตหลุด-กลับมา / รีหน้าเว็บ)
// ต้องไล่แก้ id เดิมที่ฝังอยู่ในโหวต/เป้าหมายต่างๆ ให้กลายเป็น id ใหม่ ไม่ให้ข้อมูลเดิมหาย
function remapPlayerId(room, oldId, newId) {
    const idMaps = [room.votes, room.selectedTargets, room.wolfKillVotes];

    idMaps.forEach((map) => {
        if (!map) return;
        Object.keys(map).forEach((key) => {
            const val = map[key];
            if (key === oldId) {
                delete map[key];
                map[newId] = (val === oldId) ? newId : val;
            } else if (val === oldId) {
                map[key] = newId;
            }
        });
    });

    room.players.forEach((p) => {
        if (p.huntTargetId === oldId) p.huntTargetId = newId;
    });

    if (room.host === oldId) room.host = newId;
}

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
  io.emit("roles_data", buildRolesData());
}

io.on("connection", (socket) => {
  socket.emit("roles_data", buildRolesData());
  socket.emit("suggested_room", getLatestOpenRoom());
});

const wolfRoles = Object.keys(roles).filter(
    role => roles[role].team === "wolf"
);

const roleDescription = {

"หมาป่า": {
        icon: "/images/werewolf.jpg",
        title: '<img src="/images/werewolf.jpg" width="30"> หมาป่า',
        desc: "ร่วมกันเลือกเหยื่อในกลุ่มหมาป่า และล่าในตอนกลางคืน  ลาง:ร้าย"
    },

    "ลูกหมาป่า": {
        icon: "/images/juniorwerewolf.jpg",
        title: '<img src="/images/juniorwerewolf.jpg" width="30"> ลูกหมาป่า',
        desc: "คุณสามารถเลือกเป้าหมายไว้ได้ หากคุณตายคนที่คุณเลือกไว้จะตายตามไปด้วย  ลาง:รัาย"
    },

    "หมาป่าพิทักษ์": {
        icon: "/images/guardianwolf.jpg",
        title: "🐺 หมาป่าพิทักษ์",
        desc: "คุณสามารถปกป้องหมาป่า จากการถูกโหวตประหารได้1ครั้ง  ลาง:ร้าย"
    },
    "หมาป่าดื้อรั้น": {
        icon: "/images/stubbornwolf.jpg",
        title: "🐺 หมาป่าดื้อรั้น",
        desc: "คุณมี2ชีวิต  ลาง:ไม่ทราบ"
    },
    "หมาป่านักเวท": {
        icon: "/images/wizardwolf.jpg",
        title: "🐺 หมาป่านักเวทย์",
        desc: "ร่ายเวทได้1คนต่อคืน หากอาชีพลางสังหรณ์มาส่องจะพบว่าคนนั้นอยู่ทีมหมาป่า  ลาง:ร้าย"
    },

"ชาวบ้าน": {
        icon: "/images/village.jpg",
        title: '<img src="/images/village.jpg" width="30"> ชาวบ้าน',
        desc: "ไม่มีพลังพิเศษ ใช้การโหวตเพื่อหาหมาป่า  ลาง:ดี"
    },
"ผู้ถูกสาป": {
        icon: "/images/cursed.png",
        title: '<img src="/images/cursed.png" width="30"> ผู้ถูกสาป',
        desc: "คุณอยู่ทีมชาวบ้าน แต่ถ้าหากคุณถูกหมาป่ากัด คุณจะกลายเป็นหมาป่า  ลาง:ดีหรือร้าย"
    },

    "หมอ": {
        icon: "/images/doctor.jpg",
        title: '<img src="/images/doctor.jpg" width="30"> หมอ',
        desc: "คุณสามารถป้องปกคนได้ 1 คนให้รอดจากการถูกฆ่า แต่จะไม่สามารถปกป้องตัวเองได้  ลาง:ดี"
     },
"บอดี้การ์ด": {
        icon: "/images/bodyguard.jpg",
        title: '<img src="/images/bodyguard.jpg" width="30"> บอดี้การ์ด',
        desc: "ป้องกัน 1 คนต่อคืน และปกป้องตัวเองอัตโนมัติ หากการปกป้องคุณถูกโจมตีการโจมตีครั้งถัดไปคุณจะตาย  ลาง:ดี"
    },

"นักกล้าม": {
        icon: "/images/muscleman.jpg",
        title: "💪 นักกล้าม",
        desc: "ป้องกัน 1 คนต่อคืน และปกป้องตัวเองอัตโนมัติ หากการปกป้องคุณถูกโจมตีจะเปิดเผยบทบาทผู้ที่โจมตีคุณและคุณจะตายหลังการประชุม  ลาง:ดี"
    },

    "ผู้มีลาง": {
        icon: "/images/auraseer.jpg",
        title: '<img src="/images/auraseer" width="30"> ผู้มีลาง',
        desc: "เลือก 1 คนต่อคืนเพื่อดูว่าเป็นฝ่ายดีหรือฝ่ายร้าย ลาง:ดี"
    },

     "ยายแก่": {
        icon: "/images/oldlady.jpg",
        title: "👵 ยายแก่",
        desc: "ทำให้คน1คนเป็นใบ้  ลาง:ดี"
    },
    
       "แม่มด": {
        icon: "/images/witch.jpg",
        title: "🧙‍♀️ แม่มด",
        desc: "คุณมียาพิษ และ ยาป้องกัน อย่างละขวด ยาป้องกันจะหมดก็ต่อเมื่อคุณป้องกันสำเร็จ  ลาง:ไม่ทราบ"
    },

    
     "ศาลเตี้ย": {
        icon: "/images/sheriff.jpg",
        title: "🔫 ศาลเตี้ย",
        desc: "คุณมีกระสุน1นัด และสามารถดูบทบาทคนได้1คน เห็นเฉพาะคุณเท่านั้น  ลางไม่ทราบ"
    },

    
    "นักล่าหัว": {
        icon: "/images/headhunter.jpg",
        title: '<img src="/images/headhunter.jpg" width="30"> นักล่าหัว',
        desc: "หากเป้าหมายถูกโหวตประหาร คุณจะชนะ แต่ถ้าหากเป้าหมายคุณตายด้วยวิธีอื่น คุณจะชนะพร้อมกับสัมพันธมิตรฝ่ายร้าย  ลาง:ไม่ทราบ"
    },

    

    "คนบ้า": {
        icon: "/images/fool.jpg",
        title: '<img src="/images/fool.jpg" width="30"> คนบ้า',
        desc: "ถูกโหวตประหารเพื่อขนะ  ลาง:ไม่ทราบ"
    },
     "ฆาตกร": {
        icon: "/images/murderer.jpg",
        title: "🗡️ ฆาตกร",
        desc: "สามารถฆ่าผู้เล่นได้ 1 คนต่อคืน หมาป่าฆ่าคุณไม่ได้   ลาง:ไม่ทราบ"
    }

};

// รวมข้อมูล roles (team/score/messages) กับ roleDescription (title/desc)
// เข้าด้วยกัน เพื่อส่งให้ฝั่ง client ใช้งานได้ครบในก้อนเดียว (event: roles_data)
function buildRolesData() {
    const merged = {};
    const keys = new Set([
        ...Object.keys(roles),
        ...Object.keys(roleDescription)
    ]);
    keys.forEach((key) => {
        merged[key] = {
            ...(roles[key] || {}),
            ...(roleDescription[key] || {})
        };
    });
    return merged;
}

// หาห้องที่เปิดอยู่ล่าสุด (เรียงตามลำดับที่ถูกสร้าง) สำหรับแนะนำ ROOM CODE
// ให้ผู้เล่นแบบอัตโนมัติ — เผื่อกรณีเล่นกับเพื่อนกลุ่มเดียว มีห้องเดียวที่เปิดอยู่
function getLatestOpenRoom() {
    const ids = Object.keys(rooms);
    if (ids.length === 0) return null;

    const id = ids[ids.length - 1];
    const room = rooms[id];
    if (!room) return null;

    const hostPlayer = room.players.find(p => p.isHost);

    return {
        roomId: id,
        hostName: hostPlayer ? hostPlayer.name : "",
        started: !!room.started
    };
}

function broadcastSuggestedRoom() {
    io.emit("suggested_room", getLatestOpenRoom());
}

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

        // โฮสต์ก็ต้องมี token เหมือนผู้เล่นทั่วไป เพื่อให้ "เชื่อมต่อใหม่" เข้าห้องเดิมได้
        // เวลาเน็ตหลุดแล้วกลับมา (ไม่ใช่ปิดห้องทันทีเหมือนเดิม)
        const hostToken = genId() + genId();

        rooms[id] = {
    host: socket.id,
    config: {},
    started: false,
    selectedTargets: {},
    wolfChatHistory: [],
    players: [
                {
                    id: socket.id,

                    token: hostToken,

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

        broadcastSuggestedRoom();

        cb({ roomId: id, token: hostToken });

    });

    // JOIN ROOM
    socket.on(
        "join_room",
        ({ roomId, name, token }, cb) => {

        roomId =
            roomId.toUpperCase();

        const room =
            rooms[roomId];

        if (!room) {

            return cb({
                error: "room not found"
            });

        }

        // ผู้เล่นคนนี้เคยอยู่ในห้องนี้มาก่อนแล้ว (token เดิมตรงกัน)
        // = กำลังเชื่อมต่อใหม่หลังเน็ตหลุด/รีหน้าเว็บ ไม่ใช่ผู้เล่นใหม่
        // เก็บบทบาท/สถานะเป็น-ตาย/การเลือกเป้าหมายเดิมไว้ทั้งหมด แค่สลับ socket id
        let player = token
            ? room.players.find(p => p.token === token)
            : null;

        const isReconnect = !!player;

        if (player) {

            const oldId = player.id;

            if (oldId !== socket.id) {
                remapPlayerId(room, oldId, socket.id);
                player.id = socket.id;
            }

            player.name = name || player.name;
            player.disconnected = false;

            if (pendingRemovals[token]) {
                clearTimeout(pendingRemovals[token].timer);
                delete pendingRemovals[token];
            }

        } else {

            player = room.players.find(
                p => p.id === socket.id
            );

            if (!player) {

                player = {

                    id: socket.id,

                    token: token || genId(),

                    name: name,

                    isHost: false,

                    role: null,

                    displayRole: null,

                    alive: true,

                    protected: false,

                    killed: false

                };

                room.players.push(player);

            }

        }

        socket.join(roomId);

        io.to(roomId).emit(
            "room_update",
            room
        );

        // กลับมาเชื่อมต่อใหม่ระหว่างเกมที่เริ่มไปแล้ว -> ส่งบทเดิมกลับไปให้ทันที
        // (silent: true กันไม่ให้เล่นอนิเมชั่นเปิดบทซ้ำทุกครั้งที่เน็ตสะดุด)
        if (isReconnect && room.started && player.role) {

            io.to(socket.id).emit("your_role", {
                role: player.role,
                displayRole: player.displayRole,
                huntTarget: player.huntTarget,
                huntTargetId: player.huntTargetId || null,
                roleInfo: roleDescription[player.role] || null,
                silent: true
            });

            if (
                wolfRoles.includes(player.role) &&
                room.wolfChatHistory &&
                room.wolfChatHistory.length > 0
            ) {
                io.to(socket.id).emit("wolf_chat_history", room.wolfChatHistory);
            }
        }

        cb({
            ok: true,
            roomData: room,
            token: player.token
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
        huntTargetId: p.huntTargetId || null,
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

    // TOGGLE WOLF KILL MODE
    socket.on("toggle_wolf_kill_mode", ({ roomId }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (socket.id !== room.host) return;

        room.wolfKillMode = !room.wolfKillMode;

        if (room.wolfKillMode) {
            // เปิดโหมด: เคลียร์การเลือกของรอบก่อนหน้า
            room.wolfKillVotes = {};
        } else {
            // ปิดโหมด: สรุปผล แล้วติ๊ก "เล็งฆ่า" ให้อัตโนมัติ
            const votes = room.wolfKillVotes || {};
            const chosenTargets = [...new Set(
                Object.values(votes).filter((tid) => {
                    const t = room.players.find(p => p.id === tid);
                    return t && !wolfRoles.includes(t.role); // กันกรณีเป้าหมายกลายเป็นหมาป่าไปแล้ว
                })
            )];

            if (chosenTargets.length > 0) {

                // ถ้าหมาป่าเลือกเป้าหมายมากกว่า 1 คน ให้สุ่มมาแค่คนเดียว
                const finalTargetId =
                    chosenTargets.length === 1
                        ? chosenTargets[0]
                        : chosenTargets[
                            Math.floor(Math.random() * chosenTargets.length)
                        ];

                const target = room.players.find(p => p.id === finalTargetId);
                if (target) target.killed = true;
            }

            room.wolfKillVotes = {};
        }

        io.to(roomId).emit("room_update", room);
    });

    // CAST WOLF KILL (เฉพาะทีมหมาป่า)
    socket.on("cast_wolf_kill", ({ roomId, targetId }) => {
        const room = rooms[roomId];
        if (!room) return;
        if (!room.wolfKillMode) return;

        const voter = room.players.find(p => p.id === socket.id);
        if (!voter || !voter.alive || voter.isHost) return;
        if (!wolfRoles.includes(voter.role)) return;

        if (!room.wolfKillVotes) room.wolfKillVotes = {};

        if (!targetId) {
            delete room.wolfKillVotes[socket.id];
        } else {
            if (targetId === socket.id) return;
            const target = room.players.find(p => p.id === targetId);
            if (!target || !target.alive) return;
            if (wolfRoles.includes(target.role)) return; // ห้ามหมาป่าเลือกฆ่ากันเอง
            room.wolfKillVotes[socket.id] = targetId;
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

            const wolfMsg = {
                name: player.name,
                text: msg,
                type: "wolf"
            };

            room.wolfChatHistory = room.wolfChatHistory || [];
            room.wolfChatHistory.push(wolfMsg);

            room.players.forEach(p => {
                if (wolfRoles.includes(p.role) || p.id === room.host) {
                    io.to(p.id).emit("chat_message", wolfMsg);
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

            const wolfMsg = {
                name: "HOST",
                text: msg,
                type: "wolf",
                isHost: true
            };

            room.wolfChatHistory = room.wolfChatHistory || [];
            room.wolfChatHistory.push(wolfMsg);

            room.players.forEach(p => {
                if (wolfRoles.includes(p.role) || p.id === room.host) {
                    io.to(p.id).emit("chat_message", wolfMsg);
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

            // ส่งประวัติแชทหมาป่าที่ผ่านมาให้ผู้เล่นที่กลายเป็นหมาป่า
            if (room.wolfChatHistory && room.wolfChatHistory.length > 0) {
                io.to(player.id).emit("wolf_chat_history", room.wolfChatHistory);
            }

            io.to(roomId).emit("room_update", room);
        }
    });


    // ปิดห้องจริงๆ (ใช้ทั้งตอนโฮสต์ไม่กลับมาเชื่อมต่อภายในเวลาที่กำหนด
    // และตอนโฮสต์กดปิดห้องเองด้วยปุ่ม "ปิดห้อง")
    function closeRoom(roomId, reason) {

        const room = rooms[roomId];
        if (!room) return;

        io.to(roomId).emit("room_closed", { reason });

        for (const p of room.players) {
            io.sockets.sockets.get(p.id)?.leave(roomId);

            if (pendingRemovals[p.token]) {
                clearTimeout(pendingRemovals[p.token].timer);
                delete pendingRemovals[p.token];
            }
        }

        delete rooms[roomId];

        broadcastSuggestedRoom();
    }

    // ปิดห้องเอง (โฮสต์กดปุ่ม "ปิดห้อง" ตั้งใจ ไม่ใช่เน็ตหลุด)
    socket.on("close_room", (roomId) => {

        const room = rooms[roomId];
        if (!room) return;

        if (socket.id !== room.host) return; // ต้องเป็นโฮสต์ของห้องนั้นเท่านั้น

        closeRoom(roomId, "host_closed");
    });

    socket.on("disconnect", () => {

        for (const id in rooms) {

            const room = rooms[id];

            const player = room.players.find(p => p.id === socket.id);
            if (!player) continue;

            // ไม่เตะผู้เล่น (หรือปิดห้องเพราะโฮสต์) ทันที — ให้เวลา "หลุดแล้วกลับมาใหม่"
            // (เน็ตสะดุด/มือถือล็อกสกรีน/สลับแอป) ก่อนค่อยทำจริง เหมือนกันทั้งโฮสต์และผู้เล่น
            // ผู้เล่นคนอื่นจะเห็นสถานะ "🟡 กำลังเชื่อมต่อใหม่..." แทนการถูกเตะออก/ห้องปิดทันที
            player.disconnected = true;

            io.to(id).emit("room_update", room);

            if (pendingRemovals[player.token]) {
                clearTimeout(pendingRemovals[player.token].timer);
            }

            const graceMs = player.isHost ? HOST_RECONNECT_GRACE_MS : RECONNECT_GRACE_MS;

            pendingRemovals[player.token] = {
                roomId: id,
                timer: setTimeout(() => {

                    delete pendingRemovals[player.token];

                    const stillRoom = rooms[id];
                    if (!stillRoom) return;

                    const stillPlayer = stillRoom.players.find(p => p.token === player.token);
                    if (!stillPlayer || !stillPlayer.disconnected) return; // กลับมาเชื่อมต่อแล้ว ไม่ต้องทำอะไร

                    // โฮสต์ไม่กลับมาเชื่อมต่อภายในเวลาที่กำหนด -> ปิดห้องทั้งห้องจริงๆ
                    if (stillPlayer.isHost) {
                        closeRoom(id, "host_disconnected");
                        return;
                    }

                    stillRoom.players = stillRoom.players.filter(p => p.token !== player.token);

                    if (stillRoom.players.length === 0) {
                        delete rooms[id];
                    } else {
                        io.to(id).emit("room_update", stillRoom);
                    }

                    broadcastSuggestedRoom();

                }, graceMs)
            };
        }

        broadcastSuggestedRoom();
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