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
  "Tau ant galvos atsisėdo storas senis...",
  "Prie tavęs verkia tavo geriausias draugas...",
  "Netyčia pavadinai mokytoją mama...",
  "Oro uoste tavo kelnės iširo ir teko lipti į lėktuvą tik su triusikais...",
  "Pamatei nuogos bobutės pliką plaukuotą subinę...",
  "Tavo draugas tau rimtai pasiūlo pačiulpti jo kojos pirštą...",
  "Eidamas užsižiūrėjai į telefoną ir atsitrenkei į stulpą...",
  "Tavo gerklėje istrigo labai ilgas plaukas...",
  "Parke matai kaip benamis valgo savo šūdą kaip ledus...",
  "Autobuse benamis uosto tavo kaklą...",
  "Priešais tave pargriuvo bobutė, tu juokeisi bet ji numirė...",
  "Vakare ateini į parduotuvę ir ant kasos rurinasi du vyrai..",
  "prabudai iš miego, bet ne lovoje o abiejom kojom tuolete...",
  "Tave pakvietė į televizijos šou pavadinimu DURNIAUSI LIETUVOS DEBILAI",
  "Tavo draugas netyčia tau į burną pataikė savo skrepli...",
  "Labai garsiai paperdei per laiduotuves...",
  "Taksistas pasiūlė tau pamasažuoti pėdas...",
  "Visi tavo draugai išgirdo kaip tu per miegus be perstojo šnekėjai: AŠ MĖGSTU ČIULPTI, DUOKIT PAČIULPTI...",
  "Tave iš nugaros apkabino ir pabučiavo nepažystamas vyras...",
  "Nuėjai miegoti šlapiais rūbais...",
  "Susapnavai kaip tavo draugas sukišo savo galvą tau į subinę...",
  "Vidury nakties girdi kaip kaimynai rurinasi...",
  "susirgai taip sunkiai kad net negali nueit į tuoletą...",
  "Vidury nakties girdi kaip kažkas išovė pistoletą bet tu nemėgsti savo kaimynų...",
  "Netyčia partrenkei bobutę...",
  "Sužinojai kad rytoi mirsi bet ryte, tai nereiks eit į darbą...",
  "Netyčia prarijai vorą...",
  "Tau žudikas duodą pasirinkimą - mirtis arba pabučiuok jam subinę...",
  "Tau po pažasčiu užaugo grybas...",
  "Tave pagrobė ateiviai ir prisiuvo dar viena subinę...",
  "Tau gimtadieniui padovanojo pačią lieviausią dovaną ir filmuoja tavo reakciją...",
  "Per televizoriu policija kalba apie besislepiantį nusikaltėlį ir apibūdina tave...",
  "Laimėjai milijona bet gali pirkti tik bulves...",
  "Priešais tave guli nudvėses šeškas...",
  "Gausi milijona jeigu į subinę susikiši obuolį...",
  "Tapai pasaulio imperatorium bet turėsi visą likusį gyvenimą būti nuogas...",
  "Būdamas spermos banke netyčia atsigėrei indeli spermos...",
  "Nukritai nuo skardžio tiesiai į upę pilną piranijų...",
  "Pastebėjai pusiau sukramtytą gumą vidury gatvės...",
  "Tave išdavė tavo geriausias draugas...",
  "Atsikėjei ryte ir pamatei kaip tavo draugas laižo tavo pėdas..."
  "Jauti jau nebeištversi ir apsikakosi bet jau namai prie pat..."
  "Atsikėlei ryte su skaudančia subine..."
  "Mirus nukeliavai į dangų ir dievas pamates tave sako: Ką čia šitas išgama veikia?"
  "Mirus nukeliavai į pragarą ir velnias pamates tave sako: O dabar tai pasismaginsim..."
  "Kažkas tuksenasi į tavo duris... atidarai ir pamatai Hitleri..."
  "Tau pasiūlo dirbi arklių melžėju..."
  "Mokslininkai išrado naudo medžiu rušį, kiaušiniu medis..."
  "Atidarei langą ir iskrido 8 vapsvos..."
  "Nepažystamas žmogus tau pasiūlo atsigerti keisto skysčio iš butelio..."
  "Tave Putinas pakvietė išgerti degtinės su juo..."
  "Pažiuri į dangu ir matai kaip iš lėktuvo krenta gyvuliai..."
];

const MEME_CARDS = [
  { id: 1, url: "/images/me1.png" },
  { id: 2, url: "/images/me2.png" },
  { id: 3, url: "/images/me3.png" },
  { id: 4, url: "/images/me4.png" },
  { id: 5, url: "/images/me5.png" },
  { id: 6, url: "/images/me6.png" },
  { id: 7, url: "/images/me7.png" },
  { id: 8, url: "/images/me8.png" },
  { id: 9, url: "/images/me9.png" },
  { id: 10, url: "/images/me10.png" },
  { id: 11, url: "/images/me11.png" },
  { id: 12, url: "/images/me12.png" },
  { id: 13, url: "/images/me13.png" },
  { id: 14, url: "/images/me14.png" },
  { id: 15, url: "/images/me15.png" },
  { id: 16, url: "/images/me16.png" },
  { id: 17, url: "/images/me17.png" },
  { id: 18, url: "/images/me18.png" },
  { id: 19, url: "/images/me19.png" },
  { id: 20, url: "/images/me20.png" },
  { id: 21, url: "/images/me21.png" },
  { id: 22, url: "/images/me22.png" },
  { id: 23, url: "/images/me23.png" },
  { id: 24, url: "/images/me24.png" },
  { id: 25, url: "/images/me25.png" },
  { id: 26, url: "/images/me26.png" },
  { id: 27, url: "/images/me27.png" },
  { id: 28, url: "/images/me28.png" },
  { id: 29, url: "/images/me29.png" },
  { id: 30, url: "/images/me30.png" },
  { id: 31, url: "/images/me31.png" },
  { id: 32, url: "/images/me32.png" },
  { id: 33, url: "/images/me33.png" },
  { id: 34, url: "/images/me34.png" },
  { id: 35, url: "/images/me35.png" },
  { id: 36, url: "/images/me36.png" },
  { id: 37, url: "/images/me37.png" },
  { id: 38, url: "/images/me38.png" },
  { id: 39, url: "/images/me39.png" },
  { id: 40, url: "/images/me40.png" },
  { id: 41, url: "/images/me41.png" },
  { id: 42, url: "/images/me42.png" },
  { id: 43, url: "/images/me43.png" },
  { id: 44, url: "/images/me44.png" },
  { id: 45, url: "/images/me45.png" },
  { id: 46, url: "/images/me46.png" },
  { id: 47, url: "/images/me47.png" },
  { id: 48, url: "/images/me48.png" },
  { id: 49, url: "/images/me49.png" },
  { id: 50, url: "/images/me50.png" },
  { id: 51, url: "/images/me51.png" },
  { id: 52, url: "/images/me52.png" },
  { id: 53, url: "/images/me53.png" },
  { id: 54, url: "/images/me54.png" },
  { id: 55, url: "/images/me55.png" },
  { id: 56, url: "/images/me56.png" },
  { id: 57, url: "/images/me57.png" },
  { id: 58, url: "/images/me58.png" },
  { id: 59, url: "/images/me59.png" },
  { id: 60, url: "/images/me60.png" },
  { id: 61, url: "/images/me61.png" },
  { id: 62, url: "/images/me62.png" },
  { id: 63, url: "/images/me63.png" },
  { id: 64, url: "/images/me64.png" },
  { id: 65, url: "/images/me65.png" },
  { id: 66, url: "/images/me66.png" },
  { id: 67, url: "/images/me67.png" },
  { id: 68, url: "/images/me68.png" },
  { id: 69, url: "/images/me69.png" },
  { id: 70, url: "/images/me70.png" },
  { id: 71, url: "/images/me71.png" },
  { id: 72, url: "/images/me72.png" },
  { id: 73, url: "/images/me73.png" },
  { id: 74, url: "/images/me74.png" },
  { id: 75, url: "/images/me75.png" },
  { id: 76, url: "/images/me76.png" },
  { id: 77, url: "/images/me77.png" },
  { id: 78, url: "/images/me78.png" },
  { id: 79, url: "/images/me79.png" },
  { id: 80, url: "/images/me80.png" },
  { id: 81, url: "/images/me81.png" },
  { id: 82, url: "/images/me82.png" },
  { id: 83, url: "/images/me83.png" },
  { id: 84, url: "/images/me84.png" },
  { id: 85, url: "/images/me85.png" },
  { id: 86, url: "/images/me86.png" },
  { id: 87, url: "/images/me87.png" },
  { id: 88, url: "/images/me88.png" },
  { id: 89, url: "/images/me89.png" },
  { id: 90, url: "/images/me90.png" },
  { id: 91, url: "/images/me91.png" },
  { id: 92, url: "/images/me92.png" },
  { id: 93, url: "/images/me93.png" },
  { id: 94, url: "/images/me94.png" },
  { id: 95, url: "/images/me95.png" },
  { id: 96, url: "/images/me96.png" },
  { id: 97, url: "/images/me97.png" },
  { id: 98, url: "/images/me98.png" },
  { id: 99, url: "/images/me99.png" },
  { id: 100, url: "/images/me100.png" },
  { id: 101, url: "/images/me101.png" },
  { id: 102, url: "/images/me102.png" },
  { id: 103, url: "/images/me103.png" },
  { id: 104, url: "/images/me104.png" },
  { id: 105, url: "/images/me105.png" },
  { id: 106, url: "/images/me106.png" },
  { id: 107, url: "/images/me107.png" },
  { id: 108, url: "/images/me108.png" },
  { id: 109, url: "/images/me109.png" },
  { id: 110, url: "/images/me110.png" },
  { id: 111, url: "/images/me111.png" },
  { id: 112, url: "/images/me112.png" },
  { id: 113, url: "/images/me113.png" },
  { id: 114, url: "/images/me114.png" },
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
