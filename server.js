const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

// ── Themes for situation writing ───────────────────────────────────────────
const THEMES = [
  "🍕 Maistas", "👃 Kvapas", "💪 Smurtas", "🚿 Higiena", "🐛 Vabzdžiai",
  "👴 Seni žmonės", "🚌 Viešasis transportas", "🏥 Ligoninė", "💩 Tualetas",
  "👗 Apranga", "🐶 Gyvūnai", "🌙 Naktis", "🏖️ Paplūdimys", "🍺 Alkoholis",
  "💔 Meilė", "👻 Baimė", "🎓 Mokykla", "💼 Darbas", "🛒 Parduotuvė",
  "🚗 Automobilis", "📱 Telefonas", "🎉 Vakarėlis", "🏋️ Sportas", "💰 Pinigai",
  "🌧️ Oras", "🍄 Grybai", "🔊 Garsas", "👁️ Regėjimas", "🕷️ Vorai",
  "🧓 Kaimynai",
];

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

const MEME_CARDS = Array.from({length:192},(_,i)=>({id:i+1,url:`/images/me${i+1}.png`}));

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function dealCards(n=4){return shuffle(MEME_CARDS).slice(0,n);}
function randomCard(){return MEME_CARDS[Math.floor(Math.random()*MEME_CARDS.length)];}
function numericCode(){return String(Math.floor(10000+Math.random()*90000));}
function pickThemes(n=2){return shuffle(THEMES).slice(0,n);}

const rooms = {};
const roomTimers = {}; // code -> timeout handle

function clearRoomTimer(code){
  if(roomTimers[code]){ clearTimeout(roomTimers[code]); delete roomTimers[code]; }
}
function setRoomTimer(code, ms, cb){
  clearRoomTimer(code);
  roomTimers[code] = setTimeout(cb, ms);
}

function createRoom(code){
  return {
    code, players:{}, hostId:null,
    phase:'lobby',
    baseRounds:3, round:0, maxRounds:0,
    eventDeck:[], currentEvent:null,
    playedCards:{}, playOrder:[], votes:{},
    playerEvents:{}, submittedCount:0,
    themes:[],
    // minigame scheduling: caption shows more (weight 2)
    minigameRound:0,
    mgQueue:[], // pre-shuffled queue of minigame types
    // caption
    captionImage:null, captionOrder:[], captionParts:[], captionCurrentIdx:0,
    // reaction
    reactionAssignments:{}, reactionTexts:{}, reactionOrder:[], reactionRevealIdx:0,
    // this-or-that
    totItems:[], totCurrentIdx:0, totVotes:{}, totResults:[],
  };
}

function buildMgQueue(){
  // caption appears 4x as often as others
  return shuffle(['caption','caption','caption','caption','reaction','thisorthat']);
}

function getPublicRoom(room){
  return {
    code:room.code, phase:room.phase, round:room.round, maxRounds:room.maxRounds,
    baseRounds:room.baseRounds, currentEvent:room.currentEvent,
    playedCards:room.playedCards, playOrder:room.playOrder,
    submittedCount:room.submittedCount, hostId:room.hostId,
    themes:room.themes,
    captionImage:room.captionImage, captionParts:room.captionParts,
    captionCurrentIdx:room.captionCurrentIdx, captionOrder:room.captionOrder,
    reactionOrder:room.reactionOrder, reactionRevealIdx:room.reactionRevealIdx,
    totCurrentIdx:room.totCurrentIdx,
    players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{
      name:p.name, score:p.score,
      hasPlayed:!!room.playedCards[id],
      hasSubmitted:!!(room.playerEvents[id]&&room.playerEvents[id].length===2),
    }])),
  };
}

function buildEventDeck(room){
  const playerEvs=Object.values(room.playerEvents).flat();
  const needed=room.baseRounds;
  const presets=shuffle(PRESET_EVENTS).slice(0,Math.max(0,needed-playerEvs.length));
  room.eventDeck=shuffle([...presets,...playerEvs]);
  room.maxRounds=room.eventDeck.length;
  room.mgQueue=buildMgQueue();
}

function nextNormalRound(room){
  room.round++;
  room.minigameRound++;
  room.playedCards={}; room.playOrder=[]; room.votes={};
  room.phase='playing';
  room.currentEvent=room.eventDeck[(room.round-1)%room.eventDeck.length];
  Object.values(room.players).forEach(p=>{p.hand=dealCards(4);});
}

// ── Caption ────────────────────────────────────────────────────────────────
function startCaptionMinigame(room){
  room.phase='minigame_caption';
  room.captionImage=randomCard();
  room.captionOrder=shuffle(Object.keys(room.players));
  room.captionParts=[];
  room.captionCurrentIdx=0;
}

function advanceCaptionTurn(room){
  const code=room.code;
  clearRoomTimer(code);
  // auto-submit blank if timer runs out
  setRoomTimer(code, 20000, ()=>{
    if(room.phase!=='minigame_caption') return;
    const pid=room.captionOrder[room.captionCurrentIdx];
    room.captionParts.push({playerId:pid, playerName:room.players[pid]?.name||'?', text:'...'});
    room.captionCurrentIdx++;
    const playerMap=Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name}]));
    io.to(code).emit('caption_update',{parts:room.captionParts,currentIdx:room.captionCurrentIdx,captionOrder:room.captionOrder,players:playerMap,timeLeft:20});
    if(room.captionCurrentIdx>=room.captionOrder.length){
      room.phase='minigame_caption_reveal';
      setTimeout(()=>io.to(code).emit('caption_reveal',{image:room.captionImage,parts:room.captionParts,players:playerMap}),800);
    } else {
      advanceCaptionTurn(room);
    }
  });
}

// ── Reaction ───────────────────────────────────────────────────────────────
function startReactionMinigame(room){
  room.phase='minigame_reaction_write';
  room.reactionTexts={}; room.reactionRevealIdx=0;
  room.reactionOrder=Object.keys(room.players);
  const cards=shuffle(MEME_CARDS);
  room.reactionAssignments={};
  room.reactionOrder.forEach((id,i)=>{room.reactionAssignments[id]=cards[i%cards.length];});
}

// ── This or That ───────────────────────────────────────────────────────────
function startThisOrThatMinigame(room){
  room.phase='minigame_tot_create';
  room.totItems=[];
  room.totCurrentIdx=0;
  room.totVotes={};
  room.totResults=[];
}

function buildReactionReveal(room){
  const pid=room.reactionOrder[room.reactionRevealIdx];
  return {playerId:pid,playerName:room.players[pid]?.name,card:room.reactionAssignments[pid],text:room.reactionTexts[pid],idx:room.reactionRevealIdx,total:room.reactionOrder.length};
}

function afterMinigame(room){
  clearRoomTimer(room.code);
  if(room.round>=room.maxRounds){
    room.phase='gameover';
    io.to(room.code).emit('game_over',{players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name,score:p.score}]))});
    return;
  }
  nextNormalRound(room);
  Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
  io.to(room.code).emit('room_update',getPublicRoom(room));
}

function pickNextMinigame(room){
  if(!room.mgQueue||room.mgQueue.length===0) room.mgQueue=buildMgQueue();
  return room.mgQueue.shift();
}

// ── Socket ─────────────────────────────────────────────────────────────────
io.on('connection', socket=>{

  socket.on('create_room',({name,baseRounds})=>{
    const code=numericCode();
    rooms[code]=createRoom(code);
    const room=rooms[code];
    room.hostId=socket.id;
    room.baseRounds=Math.max(1,Math.min(20,parseInt(baseRounds)||3));
    room.players[socket.id]={name,hand:dealCards(4),score:0};
    socket.join(code); socket.data.roomCode=code;
    socket.emit('room_joined',{code,hand:room.players[socket.id].hand,isHost:true});
    io.to(code).emit('room_update',getPublicRoom(room));
  });

  socket.on('join_room',({name,code})=>{
    const room=rooms[code];
    if(!room){socket.emit('error','Kambarys nerastas');return;}
    if(room.phase!=='lobby'){socket.emit('error','Žaidimas jau prasidėjo');return;}
    room.players[socket.id]={name,hand:dealCards(4),score:0};
    socket.join(code); socket.data.roomCode=code;
    socket.emit('room_joined',{code,hand:room.players[socket.id].hand,isHost:false});
    io.to(code).emit('room_update',getPublicRoom(room));
  });

  socket.on('start_game',()=>{
    const room=rooms[socket.data.roomCode];
    if(!room||socket.id!==room.hostId) return;
    room.phase='submitting';
    room.playerEvents={}; room.submittedCount=0; room.minigameRound=0;
    room.themes=pickThemes(2);
    setRoomTimer(room.code, 120000, ()=>{
      if(room.phase!=='submitting') return;
      Object.keys(room.players).forEach(pid=>{
        if(!room.playerEvents[pid]){
          const pick=shuffle(PRESET_EVENTS).slice(0,1);
          room.playerEvents[pid]=pick;
          room.submittedCount=Object.keys(room.playerEvents).length;
        }
      });
      buildEventDeck(room);
      nextNormalRound(room);
      Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
      io.to(room.code).emit('room_update',getPublicRoom(room));
    });
    io.to(room.code).emit('room_update',getPublicRoom(room));
    io.to(room.code).emit('timer_start',{duration:120,label:'submit'});
  });

  socket.on('submit_events',({events})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='submitting') return;
    if(room.playerEvents[socket.id]) return;
    const cleaned=events.map(e=>String(e||'').trim()).filter(e=>e.length>=3).slice(0,1);
    if(cleaned.length<1){socket.emit('error','Reikia situacijos!');return;}
    room.playerEvents[socket.id]=cleaned;
    room.submittedCount=Object.keys(room.playerEvents).length;
    io.to(code).emit('room_update',getPublicRoom(room));
    const total=Object.keys(room.players).length;
    if(room.submittedCount>=total){
      clearRoomTimer(code);
      buildEventDeck(room);
      nextNormalRound(room);
      Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
      io.to(code).emit('room_update',getPublicRoom(room));
    }
  });

  socket.on('play_card',({card})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='playing') return;
    if(room.playedCards[socket.id]) return;
    room.playedCards[socket.id]=card;
    room.playOrder.push(socket.id);
    const total=Object.keys(room.players).length;
    const played=Object.keys(room.playedCards).length;
    io.to(code).emit('card_played',{playerId:socket.id,playerName:room.players[socket.id]?.name,card,totalPlayed:played,totalPlayers:total});
    if(played>=total){
      room.phase='voting';
      setTimeout(()=>{
        io.to(code).emit('start_voting',{playedCards:room.playedCards,playOrder:room.playOrder,players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name}]))});
      },2500);
    }
  });

  socket.on('vote',({votedFor})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='voting') return;
    if(room.votes[socket.id]||votedFor===socket.id) return;
    room.votes[socket.id]=votedFor;
    const total=Object.keys(room.players).length;
    const voted=Object.keys(room.votes).length;
    io.to(code).emit('vote_update',{totalVotes:voted,totalPlayers:total});
    if(voted>=total){
      const tally={};
      Object.values(room.votes).forEach(v=>{tally[v]=(tally[v]||0)+1;});
      Object.entries(tally).forEach(([pid,pts])=>{if(room.players[pid])room.players[pid].score+=pts;});
      room.phase='results';
      io.to(code).emit('round_results',{playedCards:room.playedCards,playOrder:room.playOrder,players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name,score:p.score}])),votes:tally,round:room.round,maxRounds:room.maxRounds});
    }
  });

  socket.on('next_round',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;

    // every 2 normal rounds trigger a minigame
    if(room.minigameRound>0 && room.minigameRound%2===0 && room.phase==='results'){
      const mgType=pickNextMinigame(room);
      const playerMap=Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name}]));

      if(mgType==='caption'){
        startCaptionMinigame(room);
        io.to(code).emit('minigame_start',{type:'caption',image:room.captionImage,order:room.captionOrder,players:playerMap});
        setTimeout(()=>{
          io.to(code).emit('caption_update',{parts:[],currentIdx:0,captionOrder:room.captionOrder,players:playerMap,timeLeft:20});
          advanceCaptionTurn(room);
        },1000);
      } else if(mgType==='reaction'){
        startReactionMinigame(room);
        room.reactionOrder.forEach(pid=>io.to(pid).emit('reaction_assignment',{card:room.reactionAssignments[pid]}));
        io.to(code).emit('minigame_start',{type:'reaction',players:playerMap});
        // no server timer for reaction — host skips
      } else if(mgType==='thisorthat'){
        startThisOrThatMinigame(room);
        io.to(code).emit('minigame_start',{type:'thisorthat',players:playerMap});
        io.to(code).emit('timer_start',{duration:90,label:'tot_create'});
        setRoomTimer(code,90000,()=>{
          if(room.phase!=='minigame_tot_create') return;
          // auto-fill empty submissions
          Object.keys(room.players).forEach(pid=>{
            if(!room.totItems.find(i=>i.playerId===pid)){
              room.totItems.push({playerId:pid,playerName:room.players[pid]?.name||'?',situation:'(be situacijos)',optionA:'Taip',optionB:'Ne'});
            }
          });
          startTotVoting(room);
        });
      }
      io.to(code).emit('room_update',getPublicRoom(room));
      return;
    }

    if(room.round>=room.maxRounds){
      room.phase='gameover';
      io.to(code).emit('game_over',{players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name,score:p.score}]))});
      return;
    }
    nextNormalRound(room);
    Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
    io.to(code).emit('room_update',getPublicRoom(room));
  });

  // ── Caption ──────────────────────────────────────────────────────────────
  socket.on('caption_submit',({text})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_caption') return;
    if(socket.id!==room.captionOrder[room.captionCurrentIdx]) return;
    clearRoomTimer(code);
    room.captionParts.push({playerId:socket.id,playerName:room.players[socket.id]?.name||'?',text:text.trim().slice(0,120)||'...'});
    room.captionCurrentIdx++;
    const playerMap=Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name}]));
    io.to(code).emit('caption_update',{parts:room.captionParts,currentIdx:room.captionCurrentIdx,captionOrder:room.captionOrder,players:playerMap,timeLeft:20});
    if(room.captionCurrentIdx>=room.captionOrder.length){
      room.phase='minigame_caption_reveal';
      setTimeout(()=>io.to(code).emit('caption_reveal',{image:room.captionImage,parts:room.captionParts,players:playerMap}),800);
    } else {
      advanceCaptionTurn(room);
    }
  });

  socket.on('caption_done',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    afterMinigame(room);
  });

  // ── Reaction ─────────────────────────────────────────────────────────────
  socket.on('reaction_submit',({text})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_reaction_write') return;
    if(room.reactionTexts[socket.id]) return;
    room.reactionTexts[socket.id]=text.trim().slice(0,200);
    const total=Object.keys(room.players).length;
    const done=Object.keys(room.reactionTexts).length;
    io.to(code).emit('reaction_progress',{done,total});
    if(done>=total){
      room.phase='minigame_reaction_reveal';
      room.reactionRevealIdx=0;
      setTimeout(()=>io.to(code).emit('reaction_reveal_next',buildReactionReveal(room)),800);
    }
  });

  socket.on('reaction_next',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    room.reactionRevealIdx++;
    if(room.reactionRevealIdx>=room.reactionOrder.length){
      afterMinigame(room);
    } else {
      io.to(code).emit('reaction_reveal_next',buildReactionReveal(room));
    }
  });

  // ── This or That ──────────────────────────────────────────────────────────
  socket.on('tot_done',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    afterMinigame(room);
  });

  socket.on('tot_submit',({situation,optionA,optionB})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_tot_create') return;
    if(room.totItems.find(i=>i.playerId===socket.id)) return;
    room.totItems.push({playerId:socket.id,playerName:room.players[socket.id]?.name||'?',situation:situation.trim().slice(0,200),optionA:optionA.trim().slice(0,80)||'Taip',optionB:optionB.trim().slice(0,80)||'Ne'});
    const total=Object.keys(room.players).length;
    const done=room.totItems.length;
    io.to(code).emit('tot_progress',{done,total});
    if(done>=total){
      clearRoomTimer(code);
      startTotVoting(room);
    }
  });

  socket.on('tot_vote',({choice})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_tot_vote') return;
    if(room.totVotes[socket.id]!==undefined) return;
    const currentItem=room.totItems[room.totCurrentIdx];
    // creator of this question cannot vote on it
    if(currentItem&&currentItem.playerId===socket.id) return;
    room.totVotes[socket.id]=choice;
    broadcastTotVotes(room);
    // count how many eligible voters have voted (everyone except the creator)
    const creatorId=currentItem?.playerId;
    const eligibleVoters=Object.keys(room.players).filter(pid=>pid!==creatorId);
    const votedCount=eligibleVoters.filter(pid=>room.totVotes[pid]!==undefined).length;
    if(votedCount>=eligibleVoters.length) advanceTot(room);
  });

  socket.on('tot_skip',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    advanceTot(room);
  });

  socket.on('disconnect',()=>{
    const code=socket.data.roomCode;
    if(code&&rooms[code]){
      delete rooms[code].players[socket.id];
      delete rooms[code].playedCards[socket.id];
      delete rooms[code].votes[socket.id];
      delete rooms[code].playerEvents[socket.id];
      delete rooms[code].reactionTexts[socket.id];
      delete rooms[code].totVotes[socket.id];
      if(Object.keys(rooms[code].players).length===0){clearRoomTimer(code);delete rooms[code];}
      else io.to(code).emit('room_update',getPublicRoom(rooms[code]));
    }
  });
});

function startTotVoting(room){
  room.phase='minigame_tot_vote';
  room.totCurrentIdx=0;
  room.totVotes={};
  emitTotQuestion(room);
}

function emitTotQuestion(room){
  const code=room.code;
  clearRoomTimer(code);
  const item=room.totItems[room.totCurrentIdx];
  if(!item){afterMinigame(room);return;}
  io.to(code).emit('tot_question',{item,idx:room.totCurrentIdx,total:room.totItems.length,votes:{A:0,B:0}});
  io.to(code).emit('timer_start',{duration:15,label:'tot_vote'});
  setRoomTimer(code,15000,()=>{
    if(room.phase!=='minigame_tot_vote') return;
    advanceTot(room);
  });
}

function broadcastTotVotes(room){
  const tally={A:0,B:0};
  Object.values(room.totVotes).forEach(v=>{if(v==='A')tally.A++;else if(v==='B')tally.B++;});
  io.to(room.code).emit('tot_votes_update',tally);
}

function advanceTot(room){
  clearRoomTimer(room.code);
  const tally={A:0,B:0};
  Object.values(room.totVotes).forEach(v=>{if(v==='A')tally.A++;else if(v==='B')tally.B++;});
  room.totResults.push({...room.totItems[room.totCurrentIdx],tally});
  room.totCurrentIdx++;
  room.totVotes={}; // always reset votes for next question
  if(room.totCurrentIdx>=room.totItems.length){
    room.phase='minigame_tot_results';
    io.to(room.code).emit('tot_final',{results:room.totResults});
  } else {
    emitTotQuestion(room);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>console.log(`MANO REAKCIJA KAI running on port ${PORT}`));
