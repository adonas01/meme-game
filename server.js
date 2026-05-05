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
  "🍕 Maistas","👃 Kvapas","💪 Smurtas","🚿 Higiena","🐛 Vabzdžiai",
  "👴 Seni žmonės","🚌 Viešasis transportas","🏥 Ligoninė","💩 Tualetas",
  "👗 Apranga","🐶 Gyvūnai","🌙 Naktis","🏖️ Paplūdimys","🍺 Alkoholis",
  "💔 Meilė","👻 Baimė","🎓 Mokykla","💼 Darbas","🛒 Parduotuvė",
  "🚗 Automobilis","📱 Telefonas","🎉 Vakarėlis","🏋️ Sportas","💰 Pinigai",
  "🌧️ Oras","🍄 Grybai","🔊 Garsas","👁️ Regėjimas","🕷️ Vorai","🧓 Kaimynai",
];

// Preset events kept only as fallback if not enough player events
const PRESET_EVENTS = [
  "Tau ant galvos atsisėdo storas senis...",
  "Netyčia pavadinai mokytoją mama...",
  "Oro uoste tavo kelnės iširo ir teko lipti į lėktuvą tik su triusikais...",
  "Parke matai kaip benamis valgo savo šūdą kaip ledus...",
  "Prabudai iš miego, bet ne lovoje o abiejom kojom tuolete...",
  "Labai garsiai paperdei per laiduotuves...",
  "Susapnavai kaip tavo draugas sukišo savo galvą tau į subinę...",
  "Sužinojai kad rytoi mirsi bet ryte, tai nereiks eit į darbą...",
  "Tave pagrobė ateiviai ir prisiuvo dar viena subinę...",
  "Laimėjai milijona bet gali pirkti tik bulves...",
];

const MEME_CARDS = Array.from({length:192},(_,i)=>({id:i+1,url:`/images/me${i+1}.png`}));

function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function dealCards(n=4){return shuffle(MEME_CARDS).slice(0,n);}
function randomCard(){return MEME_CARDS[Math.floor(Math.random()*MEME_CARDS.length)];}
function numericCode(){return String(Math.floor(10000+Math.random()*90000));}
function pickThemes(n=2){return shuffle(THEMES).slice(0,n);}

const rooms={};
const roomTimers={};
function clearRoomTimer(code){if(roomTimers[code]){clearTimeout(roomTimers[code]);delete roomTimers[code];}}
function setRoomTimer(code,ms,cb){clearRoomTimer(code);roomTimers[code]=setTimeout(cb,ms);}

function createRoom(code){
  return {
    code, players:{}, hostId:null,
    phase:'lobby',
    baseRounds:3, round:0, maxRounds:0,
    eventDeck:[], currentEvent:null,
    playedCards:{}, playOrder:[], votes:{},
    playerEvents:{}, submittedCount:0,
    themes:[],
    minigameRound:0,
    mgQueue:[],
    // caption
    captionImage:null, captionOrder:[], captionParts:[], captionCurrentIdx:0,
    // reaction description
    reactionAssignments:{}, reactionTexts:{}, reactionOrder:[], reactionRevealIdx:0,
    // this or that
    totItems:[], totCurrentIdx:0, totVotes:{}, totResults:[],
    // kas iš mūsų
    kimSubmissions:{}, kimOrder:[], kimCurrentIdx:0, kimVotes:{}, kimResults:[],
    // guess the word
    gtwWord:'', gtwAuthorId:'', gtwGuesses:[], gtwWinnersFirst:[], gtwWinnersRest:[],
  };
}

function buildMgQueue(){
  // caption 4x, others 1x each — now 6 types total
  return shuffle(['caption','caption','caption','caption','reaction','thisorthat','kim','gtw']);
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
    kimCurrentIdx:room.kimCurrentIdx,
    players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{
      name:p.name, score:p.score,
      hasPlayed:!!room.playedCards[id],
      hasSubmitted:!!(room.playerEvents[id]&&room.playerEvents[id].length>=1),
    }])),
  };
}

function buildEventDeck(room){
  // ONLY use player-submitted events — no presets in the deck
  const playerEvs=Object.values(room.playerEvents).flat();
  if(playerEvs.length===0){
    // absolute fallback: 1 preset so game doesn't break
    room.eventDeck=shuffle(PRESET_EVENTS).slice(0,room.baseRounds);
  } else {
    // pad with presets only if fewer player events than base rounds
    const needed=Math.max(room.baseRounds, playerEvs.length);
    const extra=Math.max(0,needed-playerEvs.length);
    const presets=extra>0?shuffle(PRESET_EVENTS).slice(0,extra):[];
    room.eventDeck=shuffle([...playerEvs,...presets]);
  }
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
  clearRoomTimer(room.code);
  setRoomTimer(room.code,20000,()=>{
    if(room.phase!=='minigame_caption') return;
    const pid=room.captionOrder[room.captionCurrentIdx];
    room.captionParts.push({playerId:pid,playerName:room.players[pid]?.name||'?',text:'...'});
    room.captionCurrentIdx++;
    const playerMap=Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name}]));
    io.to(room.code).emit('caption_update',{parts:room.captionParts,currentIdx:room.captionCurrentIdx,captionOrder:room.captionOrder,players:playerMap,timeLeft:20});
    if(room.captionCurrentIdx>=room.captionOrder.length){
      room.phase='minigame_caption_reveal';
      setTimeout(()=>io.to(room.code).emit('caption_reveal',{image:room.captionImage,parts:room.captionParts,players:playerMap}),800);
    } else {
      advanceCaptionTurn(room);
    }
  });
}

// ── Reaction description ───────────────────────────────────────────────────
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
  room.totItems=[]; room.totCurrentIdx=0; room.totVotes={}; room.totResults=[];
}

// ── Kas iš mūsų ────────────────────────────────────────────────────────────
function startKimMinigame(room){
  room.phase='minigame_kim_create';
  room.kimSubmissions={}; room.kimOrder=[]; room.kimCurrentIdx=0;
  room.kimVotes={}; room.kimResults=[];
}

function startKimVoting(room){
  room.phase='minigame_kim_vote';
  room.kimOrder=shuffle(Object.keys(room.kimSubmissions));
  room.kimCurrentIdx=0;
  room.kimVotes={};
  emitKimQuestion(room);
}

function emitKimQuestion(room){
  clearRoomTimer(room.code);
  const pid=room.kimOrder[room.kimCurrentIdx];
  const text=room.kimSubmissions[pid];
  const playerMap=Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name}]));
  io.to(room.code).emit('kim_question',{
    text, authorId:pid,
    authorName:room.players[pid]?.name||'?',
    idx:room.kimCurrentIdx,
    total:room.kimOrder.length,
    players:playerMap,
  });
  io.to(room.code).emit('timer_start',{duration:20,label:'kim_vote'});
  setRoomTimer(room.code,20000,()=>{
    if(room.phase!=='minigame_kim_vote') return;
    advanceKim(room);
  });
}

function advanceKim(room){
  clearRoomTimer(room.code);
  // tally votes
  const tally={};
  Object.values(room.kimVotes).forEach(vid=>{tally[vid]=(tally[vid]||0)+1;});
  // award point to player with most votes
  let maxVotes=0;
  Object.values(tally).forEach(v=>{if(v>maxVotes)maxVotes=v;});
  const winners=Object.entries(tally).filter(([,v])=>v===maxVotes).map(([id])=>id);
  winners.forEach(wid=>{if(room.players[wid])room.players[wid].score+=1;});
  room.kimResults.push({
    text:room.kimSubmissions[room.kimOrder[room.kimCurrentIdx]],
    authorId:room.kimOrder[room.kimCurrentIdx],
    authorName:room.players[room.kimOrder[room.kimCurrentIdx]]?.name||'?',
    tally,
    winners,
  });
  room.kimCurrentIdx++;
  room.kimVotes={};
  if(room.kimCurrentIdx>=room.kimOrder.length){
    room.phase='minigame_kim_results';
    io.to(room.code).emit('kim_results',{
      results:room.kimResults,
      players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name,score:p.score}])),
    });
  } else {
    emitKimQuestion(room);
  }
}

// ── Guess the Word ─────────────────────────────────────────────────────────
function startGtwMinigame(room){
  room.phase='minigame_gtw_pick';
  // pick a random player as the word author
  const players=Object.keys(room.players);
  room.gtwAuthorId=players[Math.floor(Math.random()*players.length)];
  room.gtwWord='';
  room.gtwGuesses=[];
  room.gtwWinnersFirst=[];
  room.gtwWinnersRest=[];
  // tell the chosen player they are the author
  io.to(room.gtwAuthorId).emit('gtw_you_are_author');
  // tell everyone else to wait
  io.to(room.code).emit('gtw_waiting_for_word',{
    authorName:room.players[room.gtwAuthorId]?.name||'?',
  });
}

function startGtwGuessing(room){
  room.phase='minigame_gtw_guess';
  // 90 second timer
  io.to(room.code).emit('gtw_start_guessing',{
    authorName:room.players[room.gtwAuthorId]?.name||'?',
    guesses:room.gtwGuesses,
  });
  io.to(room.code).emit('timer_start',{duration:90,label:'gtw'});
  setRoomTimer(room.code,90000,()=>{
    if(room.phase!=='minigame_gtw_guess') return;
    endGtw(room);
  });
}

function endGtw(room){
  clearRoomTimer(room.code);
  room.phase='minigame_gtw_reveal';
  io.to(room.code).emit('gtw_reveal',{
    word:room.gtwWord,
    guesses:room.gtwGuesses,
    winnersFirst:room.gtwWinnersFirst,
    winnersRest:room.gtwWinnersRest,
    players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{name:p.name,score:p.score}])),
  });
}

// ── Shared afterMinigame ───────────────────────────────────────────────────
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

function buildReactionReveal(room){
  const pid=room.reactionOrder[room.reactionRevealIdx];
  return {playerId:pid,playerName:room.players[pid]?.name,card:room.reactionAssignments[pid],text:room.reactionTexts[pid],idx:room.reactionRevealIdx,total:room.reactionOrder.length};
}

function startTotVoting(room){
  room.phase='minigame_tot_vote';
  room.totCurrentIdx=0;
  room.totVotes={};
  emitTotQuestion(room);
}

function emitTotQuestion(room){
  clearRoomTimer(room.code);
  const item=room.totItems[room.totCurrentIdx];
  if(!item){afterMinigame(room);return;}
  io.to(room.code).emit('tot_question',{item,idx:room.totCurrentIdx,total:room.totItems.length,votes:{A:0,B:0}});
  io.to(room.code).emit('timer_start',{duration:15,label:'tot_vote'});
  setRoomTimer(room.code,15000,()=>{
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
  room.totVotes={};
  if(room.totCurrentIdx>=room.totItems.length){
    room.phase='minigame_tot_results';
    io.to(room.code).emit('tot_final',{results:room.totResults});
  } else {
    emitTotQuestion(room);
  }
}

// ── Socket ─────────────────────────────────────────────────────────────────
io.on('connection',socket=>{

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
    setRoomTimer(room.code,120000,()=>{
      if(room.phase!=='submitting') return;
      Object.keys(room.players).forEach(pid=>{
        if(!room.playerEvents[pid]){
          room.playerEvents[pid]=[shuffle(PRESET_EVENTS)[0]];
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
    if(room.submittedCount>=Object.keys(room.players).length){
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

    if(room.minigameRound>0&&room.minigameRound%2===0&&room.phase==='results'){
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
      } else if(mgType==='thisorthat'){
        startThisOrThatMinigame(room);
        io.to(code).emit('minigame_start',{type:'thisorthat',players:playerMap});
        io.to(code).emit('timer_start',{duration:90,label:'tot_create'});
        setRoomTimer(code,90000,()=>{
          if(room.phase!=='minigame_tot_create') return;
          Object.keys(room.players).forEach(pid=>{
            if(!room.totItems.find(i=>i.playerId===pid))
              room.totItems.push({playerId:pid,playerName:room.players[pid]?.name||'?',situation:'(be situacijos)',optionA:'Taip',optionB:'Ne'});
          });
          startTotVoting(room);
        });
      } else if(mgType==='kim'){
        startKimMinigame(room);
        io.to(code).emit('minigame_start',{type:'kim',players:playerMap});
        io.to(code).emit('timer_start',{duration:90,label:'kim_create'});
        setRoomTimer(code,90000,()=>{
          if(room.phase!=='minigame_kim_create') return;
          // auto-fill missing
          Object.keys(room.players).forEach(pid=>{
            if(!room.kimSubmissions[pid])
              room.kimSubmissions[pid]='Kas iš mūsų labiausiai bijo?';
          });
          startKimVoting(room);
        });
      } else if(mgType==='gtw'){
        startGtwMinigame(room);
        io.to(code).emit('minigame_start',{type:'gtw',players:playerMap});
        // 60s for author to type a word
        setRoomTimer(code,60000,()=>{
          if(room.phase!=='minigame_gtw_pick') return;
          room.gtwWord='(neatsakyta)';
          endGtw(room);
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
    room.captionParts.push({playerId:socket.id,playerName:room.players[socket.id]?.name||'?',text:text.trim().slice(0,200)||'...'});
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
    if(room.reactionRevealIdx>=room.reactionOrder.length) afterMinigame(room);
    else io.to(code).emit('reaction_reveal_next',buildReactionReveal(room));
  });

  // ── This or That ──────────────────────────────────────────────────────────
  socket.on('tot_submit',({situation,optionA,optionB})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_tot_create') return;
    if(room.totItems.find(i=>i.playerId===socket.id)) return;
    room.totItems.push({playerId:socket.id,playerName:room.players[socket.id]?.name||'?',situation:situation.trim().slice(0,200),optionA:optionA.trim().slice(0,80)||'Taip',optionB:optionB.trim().slice(0,80)||'Ne'});
    const total=Object.keys(room.players).length;
    const done=room.totItems.length;
    io.to(code).emit('tot_progress',{done,total});
    if(done>=total){clearRoomTimer(code);startTotVoting(room);}
  });

  socket.on('tot_vote',({choice})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_tot_vote') return;
    if(room.totVotes[socket.id]!==undefined) return;
    const currentItem=room.totItems[room.totCurrentIdx];
    if(currentItem&&currentItem.playerId===socket.id) return;
    room.totVotes[socket.id]=choice;
    broadcastTotVotes(room);
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

  socket.on('tot_done',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    afterMinigame(room);
  });

  // ── Kas iš mūsų ──────────────────────────────────────────────────────────
  socket.on('kim_submit',({text})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_kim_create') return;
    if(room.kimSubmissions[socket.id]) return;
    room.kimSubmissions[socket.id]=text.trim().slice(0,200);
    const total=Object.keys(room.players).length;
    const done=Object.keys(room.kimSubmissions).length;
    io.to(code).emit('kim_progress',{done,total});
    if(done>=total){clearRoomTimer(code);startKimVoting(room);}
  });

  socket.on('kim_vote',({votedFor})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_kim_vote') return;
    if(room.kimVotes[socket.id]!==undefined) return;
    if(!room.players[votedFor]) return;
    room.kimVotes[socket.id]=votedFor;
    // broadcast live vote counts (anonymously — just totals per player)
    const tally={};
    Object.values(room.kimVotes).forEach(vid=>{tally[vid]=(tally[vid]||0)+1;});
    io.to(code).emit('kim_vote_update',{tally, voted:Object.keys(room.kimVotes).length, total:Object.keys(room.players).length});
    if(Object.keys(room.kimVotes).length>=Object.keys(room.players).length) advanceKim(room);
  });

  socket.on('kim_done',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    afterMinigame(room);
  });

  // ── Guess the Word ────────────────────────────────────────────────────────
  socket.on('gtw_set_word',({word})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_gtw_pick') return;
    if(socket.id!==room.gtwAuthorId) return;
    const w=word.trim().slice(0,50);
    if(!w) return;
    room.gtwWord=w;
    clearRoomTimer(code);
    // tell everyone guessing has started (author sees different screen)
    startGtwGuessing(room);
  });

  socket.on('gtw_guess',({guess})=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||room.phase!=='minigame_gtw_guess') return;
    if(socket.id===room.gtwAuthorId) return; // author can't guess
    const g=guess.trim().slice(0,100);
    if(!g) return;
    const playerName=room.players[socket.id]?.name||'?';
    const isCorrect=g.toLowerCase()===room.gtwWord.toLowerCase();
    const entry={playerId:socket.id,playerName,text:g,correct:isCorrect,ts:Date.now()};
    room.gtwGuesses.push(entry);
    io.to(code).emit('gtw_guess_update',{entry});
    if(isCorrect){
      // first correct guess gets 2 pts, subsequent get 1 pt
      if(room.gtwWinnersFirst.length===0){
        room.players[socket.id].score+=2;
        room.gtwWinnersFirst.push(socket.id);
      } else if(!room.gtwWinnersFirst.includes(socket.id)&&!room.gtwWinnersRest.includes(socket.id)){
        room.players[socket.id].score+=1;
        room.gtwWinnersRest.push(socket.id);
      }
      // check if all non-author players guessed correctly
      const guessers=Object.keys(room.players).filter(pid=>pid!==room.gtwAuthorId);
      const allGuessed=guessers.every(pid=>room.gtwWinnersFirst.includes(pid)||room.gtwWinnersRest.includes(pid));
      if(allGuessed) endGtw(room);
    }
  });

  socket.on('gtw_done',()=>{
    const code=socket.data.roomCode;
    const room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    afterMinigame(room);
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
      delete rooms[code].kimVotes[socket.id];
      delete rooms[code].kimSubmissions[socket.id];
      if(Object.keys(rooms[code].players).length===0){clearRoomTimer(code);delete rooms[code];}
      else io.to(code).emit('room_update',getPublicRoom(rooms[code]));
    }
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`MANO REAKCIJA KAI running on port ${PORT}`));