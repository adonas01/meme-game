const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// ── Game data ──────────────────────────────────────────────────────────────

const EVENTS = [
  "You accidentally like a photo from 2014 while deep-stalking someone's Instagram",
  "Your boss adds you on LinkedIn at 11pm on a Sunday",
  "The WiFi drops during the most important part of the video call",
  "You send a text about someone... to that someone",
  "The delivery guy marks your order as delivered but there's nothing at the door",
  "Your alarm goes off during a meeting on mute — and you forgot you left it on speaker",
  "You wave back at someone who was waving at the person behind you",
  "The group chat goes silent immediately after you send a meme",
  "You confidently walk into the wrong classroom and sit down before realizing",
  "Your stomach makes a noise loud enough for the whole room to hear",
  "You hold the door open for someone who is way too far away",
  "Autocorrect changes something innocent into something completely unhinged",
  "You laugh at a joke you didn't hear and then get asked to explain it",
  "The one day you dress up, everyone asks if you have a job interview",
  "Your phone dies at 1% right when you needed it most",
  "You go to the kitchen and completely forget why you went there",
  "Someone calls instead of texting in 2024",
  "The printer jams literally every single time",
  "You confidently give directions and send someone completely the wrong way",
  "You're in a hurry and every single traffic light turns red",
];

const MEME_CARDS = [
  { id: 1, url: "https://i.imgflip.com/30b1gx.jpg", label: "This is fine" },
  { id: 2, url: "https://i.imgflip.com/1bij.jpg", label: "One does not simply" },
  { id: 3, url: "https://i.imgflip.com/4t0m5.jpg", label: "Distracted boyfriend" },
  { id: 4, url: "https://i.imgflip.com/1otk96.jpg", label: "Two buttons" },
  { id: 5, url: "https://i.imgflip.com/9ehk.jpg", label: "Waiting skeleton" },
  { id: 6, url: "https://i.imgflip.com/1g8my4.jpg", label: "Hide the pain Harold" },
  { id: 7, url: "https://i.imgflip.com/2hgfw.jpg", label: "Futurama Fry" },
  { id: 8, url: "https://i.imgflip.com/1ur9b0.jpg", label: "Expanding brain" },
  { id: 9, url: "https://i.imgflip.com/yuvgr.jpg", label: "Ancient aliens" },
  { id: 10, url: "https://i.imgflip.com/3lmzyx.jpg", label: "Bernie mittens" },
  { id: 11, url: "https://i.imgflip.com/1ihzfe.jpg", label: "Surprised Pikachu" },
  { id: 12, url: "https://i.imgflip.com/wgaba.jpg", label: "Doge" },
  { id: 13, url: "https://i.imgflip.com/5c7lwq.jpg", label: "Drake approves" },
  { id: 14, url: "https://i.imgflip.com/qiyp.jpg", label: "Grumpy Cat" },
  { id: 15, url: "https://i.imgflip.com/26am.jpg", label: "Bad Luck Brian" },
  { id: 16, url: "https://i.imgflip.com/1bhk.jpg", label: "Y U No" },
  { id: 17, url: "https://i.imgflip.com/81qs3s.jpg", label: "Pointing Spider-Man" },
  { id: 18, url: "https://i.imgflip.com/2zo1ki.jpg", label: "Gru's Plan" },
  { id: 19, url: "https://i.imgflip.com/22bdq6.jpg", label: "Change my mind" },
  { id: 20, url: "https://i.imgflip.com/3oevdk.jpg", label: "Woman yelling at cat" },
  { id: 21, url: "https://i.imgflip.com/zx9r8.jpg", label: "Evil Kermit" },
  { id: 22, url: "https://i.imgflip.com/1jwhww.jpg", label: "Mocking SpongeBob" },
  { id: 23, url: "https://i.imgflip.com/or3f6.jpg", label: "Success Kid" },
  { id: 24, url: "https://i.imgflip.com/f6jj.jpg", label: "Too damn high" },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function dealCards(count = 4) {
  return shuffle(MEME_CARDS).slice(0, count);
}

// ── Room state ─────────────────────────────────────────────────────────────

const rooms = {}; // roomCode -> room

function createRoom(code) {
  const eventDeck = shuffle(EVENTS);
  return {
    code,
    players: {},       // socketId -> { name, hand: [], score }
    phase: 'lobby',    // lobby | playing | results
    round: 0,
    maxRounds: 5,
    currentEvent: null,
    eventDeck,
    playedCards: {},   // socketId -> card
    usedEventIndices: new Set(),
  };
}

function getPublicRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    round: room.round,
    maxRounds: room.maxRounds,
    currentEvent: room.currentEvent,
    playedCards: room.playedCards,
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [
        id,
        { name: p.name, score: p.score, hasPlayed: !!room.playedCards[id] }
      ])
    ),
  };
}

function nextRound(room) {
  room.round++;
  room.playedCards = {};
  const idx = room.round - 1;
  room.currentEvent = room.eventDeck[idx % room.eventDeck.length];
  room.phase = 'playing';

  // deal fresh cards to each player
  Object.values(room.players).forEach(p => {
    p.hand = dealCards(4);
  });
}

// ── Socket handlers ────────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log('connect', socket.id);

  socket.on('create_room', ({ name }) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = createRoom(code);
    rooms[code].players[socket.id] = { name, hand: dealCards(4), score: 0 };
    socket.join(code);
    socket.data.roomCode = code;
    socket.emit('room_joined', { code, hand: rooms[code].players[socket.id].hand });
    io.to(code).emit('room_update', getPublicRoom(rooms[code]));
  });

  socket.on('join_room', ({ name, code }) => {
    const room = rooms[code.toUpperCase()];
    if (!room) { socket.emit('error', 'Room not found'); return; }
    if (room.phase !== 'lobby') { socket.emit('error', 'Game already started'); return; }
    room.players[socket.id] = { name, hand: dealCards(4), score: 0 };
    socket.join(code.toUpperCase());
    socket.data.roomCode = code.toUpperCase();
    socket.emit('room_joined', { code: code.toUpperCase(), hand: room.players[socket.id].hand });
    io.to(code.toUpperCase()).emit('room_update', getPublicRoom(room));
  });

  socket.on('start_game', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;
    nextRound(room);
    // send each player their private hand
    Object.entries(room.players).forEach(([sid, p]) => {
      io.to(sid).emit('new_hand', { hand: p.hand });
    });
    io.to(code).emit('room_update', getPublicRoom(room));
  });

  socket.on('play_card', ({ card }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.phase !== 'playing') return;
    if (room.playedCards[socket.id]) return; // already played

    room.playedCards[socket.id] = card;

    const totalPlayers = Object.keys(room.players).length;
    const totalPlayed = Object.keys(room.playedCards).length;

    io.to(code).emit('card_played', {
      playerId: socket.id,
      playerName: room.players[socket.id]?.name,
      card,
      totalPlayed,
      totalPlayers,
    });

    // all players played → show results
    if (totalPlayed >= totalPlayers) {
      room.phase = 'results';
      io.to(code).emit('round_results', {
        playedCards: room.playedCards,
        players: Object.fromEntries(
          Object.entries(room.players).map(([id, p]) => [id, { name: p.name }])
        ),
        round: room.round,
        maxRounds: room.maxRounds,
      });
    }
  });

  socket.on('next_round', () => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room) return;

    if (room.round >= room.maxRounds) {
      room.phase = 'gameover';
      io.to(code).emit('game_over', {
        players: Object.fromEntries(
          Object.entries(room.players).map(([id, p]) => [id, { name: p.name, score: p.score }])
        ),
      });
      return;
    }

    nextRound(room);
    Object.entries(room.players).forEach(([sid, p]) => {
      io.to(sid).emit('new_hand', { hand: p.hand });
    });
    io.to(code).emit('room_update', getPublicRoom(room));
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (code && rooms[code]) {
      delete rooms[code].players[socket.id];
      delete rooms[code].playedCards[socket.id];
      if (Object.keys(rooms[code].players).length === 0) {
        delete rooms[code];
      } else {
        io.to(code).emit('room_update', getPublicRoom(rooms[code]));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Meme React running on port ${PORT}`));
