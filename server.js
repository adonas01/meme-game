const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const PRESET_EVENTS = [
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
  "Vakare ateini į parduotuvę ir ant kasos rurinasi du vyrai...",
  "Prabudai iš miego, bet ne lovoje o abiejom kojom tuolete...",
  "Tave pakvietė į televizijos šou pavadinimu DURNIAUSI LIETUVOS DEBILAI",
  "Tavo draugas netyčia tau į burną pataikė savo skrepli...",
  "Labai garsiai paperdei per laiduotuves...",
  "Taksistas pasiūlė tau pamasažuoti pėdas...",
  "Visi tavo draugai išgirdo kaip tu per miegus be perstojo šnekėjai: AŠ MĖGSTU ČIULPTI, DUOKIT PAČIULPTI...",
  "Tave iš nugaros apkabino ir pabučiavo nepažystamas vyras...",
  "Nuėjai miegoti šlapiais rūbais...",
  "Susapnavai kaip tavo draugas sukišo savo galvą tau į subinę...",
  "Vidury nakties girdi kaip kaimynai rurinasi...",
  "Susirgai taip sunkiai kad net negali nueit į tuoletą...",
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
  "Atsikėjei ryte ir pamatei kaip tavo draugas laižo tavo pėdas...",
  "Jauti jau nebeištversi ir apsikakosi bet jau namai prie pat...",
  "Atsikėlei ryte su skaudančia subine...",
  "Mirus nukeliavai į dangų ir dievas pamates tave sako: Ką čia šitas išgama veikia?",
  "Mirus nukeliavai į pragarą ir velnias pamates tave sako: O dabar tai pasismaginsim...",
  "Kažkas tuksenasi į tavo duris... atidarai ir pamatai Hitleri...",
  "Tau pasiūlo dirbi arklių melžėju...",
  "Mokslininkai išrado naudo medžiu rušį, kiaušiniu medis...",
  "Atidarei langą ir iskrido 8 vapsvos...",
  "Nepažystamas žmogus tau pasiūlo atsigerti keisto skysčio iš butelio...",
  "Tave Putinas pakvietė išgerti degtinės su juo...",
  "Pažiuri į dangu ir matai kaip iš lėktuvo krenta gyvuliai...",
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
  { id: 115, url: "/images/me115.png" },
  { id: 116, url: "/images/me116.png" },
  { id: 117, url: "/images/me117.png" },
  { id: 118, url: "/images/me118.png" },
  { id: 119, url: "/images/me119.png" },
  { id: 120, url: "/images/me120.png" },
  { id: 121, url: "/images/me121.png" },
  { id: 122, url: "/images/me122.png" },
  { id: 123, url: "/images/me123.png" },
  { id: 124, url: "/images/me124.png" },
  { id: 125, url: "/images/me125.png" },
  { id: 126, url: "/images/me126.png" },
  { id: 127, url: "/images/me127.png" },
  { id: 128, url: "/images/me128.png" },
  { id: 129, url: "/images/me129.png" },
  { id: 130, url: "/images/me130.png" },
  { id: 131, url: "/images/me131.png" },
  { id: 132, url: "/images/me132.png" },
  { id: 133, url: "/images/me133.png" },
  { id: 134, url: "/images/me134.png" },
  { id: 135, url: "/images/me135.png" },
  { id: 136, url: "/images/me136.png" },
  { id: 137, url: "/images/me137.png" },
  { id: 138, url: "/images/me138.png" },
  { id: 139, url: "/images/me139.png" },
  { id: 140, url: "/images/me140.png" },
  { id: 141, url: "/images/me141.png" },
  { id: 142, url: "/images/me142.png" },
  { id: 143, url: "/images/me143.png" },
  { id: 144, url: "/images/me144.png" },
  { id: 145, url: "/images/me145.png" },
  { id: 146, url: "/images/me146.png" },
  { id: 147, url: "/images/me147.png" },
  { id: 148, url: "/images/me148.png" },
  { id: 149, url: "/images/me149.png" },
  { id: 150, url: "/images/me150.png" },
  { id: 151, url: "/images/me151.png" },
  { id: 152, url: "/images/me152.png" },
  { id: 153, url: "/images/me153.png" },
  { id: 154, url: "/images/me154.png" },
  { id: 155, url: "/images/me155.png" },
  { id: 156, url: "/images/me156.png" },
  { id: 157, url: "/images/me157.png" },
  { id: 158, url: "/images/me158.png" },
  { id: 159, url: "/images/me159.png" },
  { id: 160, url: "/images/me160.png" },
  { id: 161, url: "/images/me161.png" },
  { id: 162, url: "/images/me162.png" },
  { id: 163, url: "/images/me163.png" },
  { id: 164, url: "/images/me164.png" },
  { id: 165, url: "/images/me165.png" },
  { id: 166, url: "/images/me166.png" },
  { id: 167, url: "/images/me167.png" },
  { id: 168, url: "/images/me168.png" },
  { id: 169, url: "/images/me169.png" },
  { id: 170, url: "/images/me170.png" },
  { id: 171, url: "/images/me171.png" },
  { id: 172, url: "/images/me172.png" },
  { id: 173, url: "/images/me173.png" },
  { id: 174, url: "/images/me174.png" },
  { id: 175, url: "/images/me175.png" },
  { id: 176, url: "/images/me176.png" },
  { id: 177, url: "/images/me177.png" },
  { id: 178, url: "/images/me178.png" },
  { id: 179, url: "/images/me179.png" },
  { id: 180, url: "/images/me180.png" },
  { id: 181, url: "/images/me181.png" },
  { id: 182, url: "/images/me182.png" },
  { id: 183, url: "/images/me183.png" },
  { id: 184, url: "/images/me184.png" },
  { id: 185, url: "/images/me185.png" },
  { id: 186, url: "/images/me186.png" },
  { id: 187, url: "/images/me187.png" },
  { id: 188, url: "/images/me188.png" },
  { id: 189, url: "/images/me189.png" },
  { id: 190, url: "/images/me190.png" },
  { id: 191, url: "/images/me191.png" },
  { id: 192, url: "/images/me192.png" },
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

const rooms = {};

function createRoom(code) {
  return {
    code,
    players: {},
    phase: 'lobby',       // lobby | submitting | playing | voting | results | gameover
    round: 0,
    maxRounds: 0,         // set after event submission
    eventDeck: [],        // built after submission
    currentEvent: null,
    playedCards: {},
    playOrder: [],
    votes: {},
    playerEvents: {},     // socketId -> event string submitted
    submittedCount: 0,
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
    playOrder: room.playOrder,
    submittedCount: room.submittedCount,
    players: Object.fromEntries(
      Object.entries(room.players).map(([id, p]) => [
        id, { name: p.name, score: p.score, hasPlayed: !!room.playedCards[id], hasSubmitted: !!room.playerEvents[id] }
      ])
    ),
  };
}

function buildEventDeck(room) {
  const playerEventList = Object.values(room.playerEvents);
  const playerCount = Object.keys(room.players).length;
  // base rounds = player count, plus one per player event
  room.maxRounds = playerCount + playerEventList.length;
  // shuffle presets and take enough to fill non-player-event rounds
  const presetShuffled = shuffle(PRESET_EVENTS).slice(0, playerCount);
  // interleave: shuffle player events into the deck randomly
  const allEvents = shuffle([...presetShuffled, ...playerEventList]);
  room.eventDeck = allEvents;
}

function nextRound(room) {
  room.round++;
  room.playedCards = {};
  room.playOrder = [];
  room.votes = {};
  room.currentEvent = room.eventDeck[(room.round - 1) % room.eventDeck.length];
  room.phase = 'playing';
  Object.values(room.players).forEach(p => { p.hand = dealCards(4); });
}

io.on('connection', (socket) => {

  socket.on('create_room', ({ name }) => {
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[code] = createRoom(code);
    rooms[code].players[socket.id] = { name, hand: dealCards(4), score: 0 };
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.isHost = true;
    socket.emit('room_joined', { code, hand: rooms[code].players[socket.id].hand, isHost: true });
    io.to(code).emit('room_update', getPublicRoom(rooms[code]));
  });

  socket.on('join_room', ({ name, code }) => {
    const room = rooms[code.toUpperCase()];
    if (!room) { socket.emit('error', 'Kambarys nerastas'); return; }
    if (room.phase !== 'lobby') { socket.emit('error', 'Žaidimas jau prasidėjo'); return; }
    room.players[socket.id] = { name, hand: dealCards(4), score: 0 };
    socket.join(code.toUpperCase());
    socket.data.roomCode = code.toUpperCase();
    socket.data.isHost = false;
    socket.emit('room_joined', { code: code.toUpperCase(), hand: room.players[socket.id].hand, isHost: false });
    io.to(code.toUpperCase()).emit('room_update', getPublicRoom(room));
  });

  socket.on('start_game', () => {
    const room = rooms[socket.data.roomCode];
    if (!room) return;
    // move to event submission phase
    room.phase = 'submitting';
    room.playerEvents = {};
    room.submittedCount = 0;
    io.to(room.code).emit('room_update', getPublicRoom(room));
  });

  socket.on('submit_event', ({ event }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.phase !== 'submitting') return;
    if (room.playerEvents[socket.id]) return; // already submitted

    const trimmed = event.trim();
    if (!trimmed) return;

    room.playerEvents[socket.id] = trimmed;
    room.submittedCount = Object.keys(room.playerEvents).length;

    io.to(code).emit('room_update', getPublicRoom(room));

    const totalPlayers = Object.keys(room.players).length;
    if (room.submittedCount >= totalPlayers) {
      // everyone submitted — build deck and start
      buildEventDeck(room);
      nextRound(room);
      Object.entries(room.players).forEach(([sid, p]) => io.to(sid).emit('new_hand', { hand: p.hand }));
      io.to(code).emit('room_update', getPublicRoom(room));
    }
  });

  socket.on('play_card', ({ card }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.phase !== 'playing') return;
    if (room.playedCards[socket.id]) return;

    room.playedCards[socket.id] = card;
    room.playOrder.push(socket.id);

    const totalPlayers = Object.keys(room.players).length;
    const totalPlayed = Object.keys(room.playedCards).length;

    io.to(code).emit('card_played', {
      playerId: socket.id,
      playerName: room.players[socket.id]?.name,
      card, totalPlayed, totalPlayers,
    });

    if (totalPlayed >= totalPlayers) {
      room.phase = 'voting';
      setTimeout(() => {
        io.to(code).emit('start_voting', {
          playedCards: room.playedCards,
          playOrder: room.playOrder,
          players: Object.fromEntries(
            Object.entries(room.players).map(([id, p]) => [id, { name: p.name }])
          ),
        });
      }, 2500);
    }
  });

  socket.on('vote', ({ votedFor }) => {
    const code = socket.data.roomCode;
    const room = rooms[code];
    if (!room || room.phase !== 'voting') return;
    if (room.votes[socket.id]) return;
    if (votedFor === socket.id) return;

    room.votes[socket.id] = votedFor;

    const totalPlayers = Object.keys(room.players).length;
    const totalVotes = Object.keys(room.votes).length;

    io.to(code).emit('vote_update', { totalVotes, totalPlayers });

    if (totalVotes >= totalPlayers) {
      const tally = {};
      Object.values(room.votes).forEach(vid => { tally[vid] = (tally[vid] || 0) + 1; });
      Object.entries(tally).forEach(([pid, pts]) => { if (room.players[pid]) room.players[pid].score += pts; });

      room.phase = 'results';
      io.to(code).emit('round_results', {
        playedCards: room.playedCards,
        playOrder: room.playOrder,
        players: Object.fromEntries(
          Object.entries(room.players).map(([id, p]) => [id, { name: p.name, score: p.score }])
        ),
        votes: tally,
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
    Object.entries(room.players).forEach(([sid, p]) => io.to(sid).emit('new_hand', { hand: p.hand }));
    io.to(code).emit('room_update', getPublicRoom(room));
  });

  socket.on('disconnect', () => {
    const code = socket.data.roomCode;
    if (code && rooms[code]) {
      delete rooms[code].players[socket.id];
      delete rooms[code].playedCards[socket.id];
      delete rooms[code].votes[socket.id];
      delete rooms[code].playerEvents[socket.id];
      if (Object.keys(rooms[code].players).length === 0) {
        delete rooms[code];
      } else {
        io.to(code).emit('room_update', getPublicRoom(rooms[code]));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`MemeReact running on port ${PORT}`));
