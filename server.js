const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

const THEMES = [
  "🍕 Maistas","👃 Kvapas","💪 Smurtas","🚿 Higiena","🐛 Vabzdžiai",
  "👴 Seni žmonės","🚌 Viešasis transportas","🏥 Ligoninė","💩 Tualetas",
  "👗 Apranga","🐶 Gyvūnai","🌙 Naktis","🏖️ Paplūdimys","🍺 Alkoholis",
  "💔 Meilė","👻 Baimė","🎓 Mokykla","💼 Darbas","🛒 Parduotuvė",
  "🚗 Automobilis","📱 Telefonas","🎉 Vakarėlis","🏋️ Sportas","💰 Pinigai",
  "🌧️ Oras","🍄 Grybai","🔊 Garsas","👁️ Regėjimas","🕷️ Vorai","🧓 Kaimynai",
];

const MEME_CARDS = Array.from({length:192},(_,i)=>({id:i+1,url:`/images/me${i+1}.png`}));

function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function dealCards(n=4){return shuffle(MEME_CARDS).slice(0,n);}
function randomCard(){return MEME_CARDS[Math.floor(Math.random()*MEME_CARDS.length)];}
function numericCode(){return String(Math.floor(10000+Math.random()*90000));}

const rooms={}, timers={};
function clearT(code){if(timers[code]){clearTimeout(timers[code]);delete timers[code];}}
function setT(code,ms,cb){clearT(code);timers[code]=setTimeout(cb,ms);}

// Default minigame counts per type
const DEFAULT_MG_COUNTS = {caption:4,reaction:1,thisorthat:1,kim:1,gtw:1,shop:1};

function createRoom(code){
  return {
    code, players:{}, hostId:null,
    phase:'lobby',
    baseRounds:3, round:0, maxRounds:0,
    eventDeck:[], currentEvent:null,
    playedCards:{}, playOrder:[], votes:{},
    playerEvents:{}, submittedCount:0,
    themes:[], mgCounts:{...DEFAULT_MG_COUNTS},
    minigameRound:0, mgQueue:[], gameSequence:[], seqIdx:0,
    // caption
    captionImage:null,captionOrder:[],captionParts:[],captionCurrentIdx:0,
    // reaction
    reactionAssignments:{},reactionTexts:{},reactionOrder:[],reactionRevealIdx:0,
    // thisorthat
    totItems:[],totCurrentIdx:0,totVotes:{},totResults:[],
    // kim
    kimSubmissions:{},kimOrder:[],kimCurrentIdx:0,kimVotes:{},kimResults:[],
    // gtw
    gtwWord:'',gtwAuthorId:'',gtwGuesses:[],gtwWinnersFirst:[],gtwWinnersRest:[],
    // shop
    shopProducts:[],shopBudget:100,shopCart:{},shopSubmittedCount:0,
  };
}

function buildMgQueue(mgCounts){
  const q=[];
  Object.entries(mgCounts).forEach(([type,count])=>{
    for(let i=0;i<Math.max(0,parseInt(count)||0);i++) q.push(type);
  });
  return shuffle(q);
}

function getPublicRoom(room){
  return {
    code:room.code,phase:room.phase,round:room.round,maxRounds:room.maxRounds,
    baseRounds:room.baseRounds,currentEvent:room.currentEvent,
    playedCards:room.playedCards,playOrder:room.playOrder,
    submittedCount:room.submittedCount,hostId:room.hostId,themes:room.themes,
    mgCounts:room.mgCounts,
    captionImage:room.captionImage,captionParts:room.captionParts,
    captionCurrentIdx:room.captionCurrentIdx,captionOrder:room.captionOrder,
    reactionOrder:room.reactionOrder,
    totCurrentIdx:room.totCurrentIdx,
    kimCurrentIdx:room.kimCurrentIdx,
    shopProducts:room.shopProducts,
    players:Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,{
      name:p.name,score:p.score,
      hasPlayed:!!room.playedCards[id],
      hasSubmitted:!!(room.playerEvents[id]&&room.playerEvents[id].length>=1),
    }])),
  };
}

function buildEventDeck(room){
  const evs=Object.values(room.playerEvents).flat();
  if(evs.length===0){room.eventDeck=['(situacija neparašyta)'];}
  else{room.eventDeck=shuffle(evs);}
  room.mgQueue=buildMgQueue(room.mgCounts);
  buildGameSequence(room);
  // maxRounds = number of round-type entries in sequence
  room.maxRounds=room.gameSequence.filter(s=>s.type==='round').length;
}

function nextNormalRound(room){
  room.round++;
  room.playedCards={};room.playOrder=[];room.votes={};
  room.phase='playing';
  room.currentEvent=room.gameSequence[room.seqIdx]?.event||'(situacija neparašyta)';
  room.seqIdx++;
  Object.values(room.players).forEach(p=>{p.hand=dealCards(4);});
}

function afterMinigame(room){
  clearT(room.code);
  // check next in sequence
  const next=room.gameSequence[room.seqIdx];
  if(!next){
    room.phase='gameover';
    io.to(room.code).emit('game_over',{players:pMap(room,true)});
    return;
  }
  if(next.type==='round'){
    nextNormalRound(room);
    Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
    io.to(room.code).emit('room_update',getPublicRoom(room));
  } else {
    // another minigame back to back — rare but handle it
    room.seqIdx++;
    // just go to next normal round after skipping extra minigames
    afterMinigame(room);
  }
}

function pMap(room,withScore=false){
  return Object.fromEntries(Object.entries(room.players).map(([id,p])=>[id,withScore?{name:p.name,score:p.score}:{name:p.name}]));
}

function buildGameSequence(room){
  // Build a full sequence: interleave minigames between rounds
  // Pattern: play 1 normal round, then 1 minigame (if any left), repeat
  const events=[...room.eventDeck];
  const mgs=[...room.mgQueue];
  const seq=[];
  let ei=0,mi=0;
  while(ei<events.length||mi<mgs.length){
    if(ei<events.length) seq.push({type:'round',event:events[ei++]});
    if(mi<mgs.length) seq.push({type:'minigame',mg:mgs[mi++]});
  }
  room.gameSequence=seq;
  room.seqIdx=0;
}

// ── Caption ────────────────────────────────────────────────────────────────
function startCaption(room){
  room.phase='minigame_caption';
  room.captionImage=randomCard();
  room.captionOrder=shuffle(Object.keys(room.players));
  room.captionParts=[];room.captionCurrentIdx=0;
}
function advanceCaption(room){
  clearT(room.code);
  setT(room.code,20000,()=>{
    if(room.phase!=='minigame_caption') return;
    const pid=room.captionOrder[room.captionCurrentIdx];
    room.captionParts.push({playerId:pid,playerName:room.players[pid]?.name||'?',text:'...'});
    room.captionCurrentIdx++;
    io.to(room.code).emit('caption_update',{parts:room.captionParts,currentIdx:room.captionCurrentIdx,captionOrder:room.captionOrder,players:pMap(room)});
    if(room.captionCurrentIdx>=room.captionOrder.length){
      room.phase='minigame_caption_reveal';
      setTimeout(()=>io.to(room.code).emit('caption_reveal',{image:room.captionImage,parts:room.captionParts,players:pMap(room)}),800);
    } else advanceCaption(room);
  });
}

// ── Reaction ───────────────────────────────────────────────────────────────
function startReaction(room){
  room.phase='minigame_reaction_write';
  room.reactionTexts={};room.reactionRevealIdx=0;
  room.reactionOrder=Object.keys(room.players);
  const cards=shuffle(MEME_CARDS);
  room.reactionAssignments={};
  room.reactionOrder.forEach((id,i)=>{room.reactionAssignments[id]=cards[i%cards.length];});
}
function reactionRevealPayload(room){
  const pid=room.reactionOrder[room.reactionRevealIdx];
  return {playerId:pid,playerName:room.players[pid]?.name,card:room.reactionAssignments[pid],text:room.reactionTexts[pid],idx:room.reactionRevealIdx,total:room.reactionOrder.length};
}

// ── This or That ───────────────────────────────────────────────────────────
function startTot(room){room.phase='minigame_tot_create';room.totItems=[];room.totCurrentIdx=0;room.totVotes={};room.totResults=[];}
function startTotVoting(room){room.phase='minigame_tot_vote';room.totCurrentIdx=0;room.totVotes={};emitTotQ(room);}
function emitTotQ(room){
  clearT(room.code);
  const item=room.totItems[room.totCurrentIdx];
  if(!item){afterMinigame(room);return;}
  io.to(room.code).emit('tot_question',{item,idx:room.totCurrentIdx,total:room.totItems.length});
  io.to(room.code).emit('timer_start',{duration:15,label:'tot_vote'});
  setT(room.code,15000,()=>{if(room.phase==='minigame_tot_vote')advanceTot(room);});
}
function advanceTot(room){
  clearT(room.code);
  const tally={A:0,B:0};
  Object.values(room.totVotes).forEach(v=>{if(v==='A')tally.A++;else if(v==='B')tally.B++;});
  room.totResults.push({...room.totItems[room.totCurrentIdx],tally});
  room.totCurrentIdx++;room.totVotes={};
  if(room.totCurrentIdx>=room.totItems.length){room.phase='minigame_tot_results';io.to(room.code).emit('tot_final',{results:room.totResults});}
  else emitTotQ(room);
}
function broadcastTotVotes(room){
  const t={A:0,B:0};Object.values(room.totVotes).forEach(v=>{if(v==='A')t.A++;else if(v==='B')t.B++;});
  io.to(room.code).emit('tot_votes_update',t);
}

// ── Kas iš mūsų ────────────────────────────────────────────────────────────
function startKim(room){room.phase='minigame_kim_create';room.kimSubmissions={};room.kimOrder=[];room.kimCurrentIdx=0;room.kimVotes={};room.kimResults=[];}
function startKimVoting(room){
  room.phase='minigame_kim_vote';
  room.kimOrder=shuffle(Object.keys(room.kimSubmissions));
  room.kimCurrentIdx=0;room.kimVotes={};
  emitKimQ(room);
}
function emitKimQ(room){
  clearT(room.code);
  const pid=room.kimOrder[room.kimCurrentIdx];
  io.to(room.code).emit('kim_question',{text:room.kimSubmissions[pid],authorId:pid,authorName:room.players[pid]?.name||'?',idx:room.kimCurrentIdx,total:room.kimOrder.length,players:pMap(room)});
  io.to(room.code).emit('timer_start',{duration:20,label:'kim_vote'});
  setT(room.code,20000,()=>{if(room.phase==='minigame_kim_vote')advanceKim(room);});
}
function advanceKim(room){
  clearT(room.code);
  const tally={};
  Object.values(room.kimVotes).forEach(vid=>{tally[vid]=(tally[vid]||0)+1;});
  let maxV=0;Object.values(tally).forEach(v=>{if(v>maxV)maxV=v;});
  const winners=Object.entries(tally).filter(([,v])=>v===maxV).map(([id])=>id);
  winners.forEach(wid=>{if(room.players[wid])room.players[wid].score+=1;});
  room.kimResults.push({text:room.kimSubmissions[room.kimOrder[room.kimCurrentIdx]],authorId:room.kimOrder[room.kimCurrentIdx],authorName:room.players[room.kimOrder[room.kimCurrentIdx]]?.name||'?',tally,winners});
  room.kimCurrentIdx++;room.kimVotes={};
  if(room.kimCurrentIdx>=room.kimOrder.length){
    room.phase='minigame_kim_results';
    io.to(room.code).emit('kim_results',{results:room.kimResults,players:pMap(room,true)});
  } else emitKimQ(room);
}

// ── Guess the Word ─────────────────────────────────────────────────────────
function startGtw(room){
  room.phase='minigame_gtw_pick';
  const pids=Object.keys(room.players);
  room.gtwAuthorId=pids[Math.floor(Math.random()*pids.length)];
  room.gtwWord='';room.gtwGuesses=[];room.gtwWinnersFirst=[];room.gtwWinnersRest=[];
  io.to(room.gtwAuthorId).emit('gtw_you_are_author');
  io.to(room.code).emit('gtw_waiting_for_word',{authorName:room.players[room.gtwAuthorId]?.name||'?'});
  setT(room.code,60000,()=>{if(room.phase==='minigame_gtw_pick'){room.gtwWord='(neatsakyta)';endGtw(room);}});
}
function startGtwGuessing(room){
  room.phase='minigame_gtw_guess';
  io.to(room.code).emit('gtw_start_guessing',{authorName:room.players[room.gtwAuthorId]?.name||'?',guesses:room.gtwGuesses});
  io.to(room.code).emit('timer_start',{duration:90,label:'gtw'});
  setT(room.code,90000,()=>{if(room.phase==='minigame_gtw_guess')endGtw(room);});
}
function endGtw(room){
  clearT(room.code);
  room.phase='minigame_gtw_reveal';
  io.to(room.code).emit('gtw_reveal',{word:room.gtwWord,guesses:room.gtwGuesses,winnersFirst:room.gtwWinnersFirst,winnersRest:room.gtwWinnersRest,players:pMap(room,true)});
}

// ── Shop ───────────────────────────────────────────────────────────────────
function startShop(room){
  room.phase='minigame_shop_create';
  room.shopProducts=[];room.shopCart={};room.shopSubmittedCount=0;
  Object.keys(room.players).forEach(pid=>{room.shopCart[pid]={budget:100,purchases:[]};});
}
function startShopBuying(room){
  room.phase='minigame_shop_buy';
  io.to(room.code).emit('shop_open',{products:room.shopProducts,budget:100});
  io.to(room.code).emit('timer_start',{duration:30,label:'shop'});
  setT(room.code,30000,()=>{if(room.phase==='minigame_shop_buy')endShop(room);});
}
function endShop(room){
  clearT(room.code);
  room.phase='minigame_shop_results';
  io.to(room.code).emit('shop_results',{products:room.shopProducts,carts:room.shopCart,players:pMap(room)});
}

// ── Sockets ────────────────────────────────────────────────────────────────
io.on('connection',socket=>{

  socket.on('create_room',({name,mgCounts})=>{
    const code=numericCode();
    rooms[code]=createRoom(code);
    const room=rooms[code];
    room.hostId=socket.id;
    if(mgCounts&&typeof mgCounts==='object'){
      Object.keys(DEFAULT_MG_COUNTS).forEach(k=>{
        room.mgCounts[k]=Math.max(0,Math.min(10,parseInt(mgCounts[k])||0));
      });
    }
    room.players[socket.id]={name,hand:dealCards(4),score:0};
    socket.join(code);socket.data.roomCode=code;
    socket.emit('room_joined',{code,hand:room.players[socket.id].hand,isHost:true});
    io.to(code).emit('room_update',getPublicRoom(room));
  });

  socket.on('join_room',({name,code})=>{
    const room=rooms[code];
    if(!room){socket.emit('error','Kambarys nerastas');return;}
    if(room.phase!=='lobby'){socket.emit('error','Žaidimas jau prasidėjo');return;}
    room.players[socket.id]={name,hand:dealCards(4),score:0};
    socket.join(code);socket.data.roomCode=code;
    socket.emit('room_joined',{code,hand:room.players[socket.id].hand,isHost:false});
    io.to(code).emit('room_update',getPublicRoom(room));
  });

  socket.on('start_game',()=>{
    const room=rooms[socket.data.roomCode];
    if(!room||socket.id!==room.hostId) return;
    room.phase='submitting';room.playerEvents={};room.submittedCount=0;room.minigameRound=0;
    room.themes=shuffle(THEMES).slice(0,2);
    setT(room.code,120000,()=>{
      if(room.phase!=='submitting') return;
      // players who didn't submit just get skipped — no preset fallback
      buildEventDeck(room);
      nextNormalRound(room);
      Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
      io.to(room.code).emit('room_update',getPublicRoom(room));
    });
    io.to(room.code).emit('room_update',getPublicRoom(room));
    io.to(room.code).emit('timer_start',{duration:120,label:'submit'});
  });

  socket.on('submit_events',({events})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='submitting'||room.playerEvents[socket.id]) return;
    const cleaned=events.map(e=>String(e||'').trim()).filter(e=>e.length>=3).slice(0,1);
    if(!cleaned.length){socket.emit('error','Reikia situacijos!');return;}
    room.playerEvents[socket.id]=cleaned;
    room.submittedCount=Object.keys(room.playerEvents).length;
    io.to(code).emit('room_update',getPublicRoom(room));
    if(room.submittedCount>=Object.keys(room.players).length){
      clearT(code);buildEventDeck(room);nextNormalRound(room);
      Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
      io.to(code).emit('room_update',getPublicRoom(room));
    }
  });

  socket.on('play_card',({card})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='playing'||room.playedCards[socket.id]) return;
    room.playedCards[socket.id]=card;room.playOrder.push(socket.id);
    const total=Object.keys(room.players).length,played=Object.keys(room.playedCards).length;
    io.to(code).emit('card_played',{playerId:socket.id,playerName:room.players[socket.id]?.name,card,totalPlayed:played,totalPlayers:total});
    if(played>=total){
      room.phase='voting';
      setTimeout(()=>io.to(code).emit('start_voting',{playedCards:room.playedCards,playOrder:room.playOrder,players:pMap(room)}),2500);
    }
  });

  socket.on('vote',({votedFor})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='voting'||room.votes[socket.id]||votedFor===socket.id) return;
    room.votes[socket.id]=votedFor;
    const total=Object.keys(room.players).length,voted=Object.keys(room.votes).length;
    io.to(code).emit('vote_update',{totalVotes:voted,totalPlayers:total});
    if(voted>=total){
      const tally={};Object.values(room.votes).forEach(v=>{tally[v]=(tally[v]||0)+1;});
      Object.entries(tally).forEach(([pid,pts])=>{if(room.players[pid])room.players[pid].score+=pts;});
      room.phase='results';
      io.to(code).emit('round_results',{playedCards:room.playedCards,playOrder:room.playOrder,players:pMap(room,true),votes:tally,round:room.round,maxRounds:room.maxRounds});
    }
  });

  socket.on('next_round',()=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    advanceSequence(room);
  });

  function advanceSequence(room){
    const code=room.code;
    // peek at next item in sequence
    const next=room.gameSequence[room.seqIdx];
    if(!next){
      // sequence done
      room.phase='gameover';
      io.to(code).emit('game_over',{players:pMap(room,true)});
      return;
    }
    if(next.type==='round'){
      nextNormalRound(room);
      Object.entries(room.players).forEach(([sid,p])=>io.to(sid).emit('new_hand',{hand:p.hand}));
      io.to(code).emit('room_update',getPublicRoom(room));
    } else {
      // minigame
      room.seqIdx++;
      const mg=next.mg;
      const pm=pMap(room);
      if(mg==='caption'){startCaption(room);io.to(code).emit('minigame_start',{type:'caption',image:room.captionImage,order:room.captionOrder,players:pm});setTimeout(()=>{io.to(code).emit('caption_update',{parts:[],currentIdx:0,captionOrder:room.captionOrder,players:pm});advanceCaption(room);},1000);}
      else if(mg==='reaction'){startReaction(room);room.reactionOrder.forEach(pid=>io.to(pid).emit('reaction_assignment',{card:room.reactionAssignments[pid]}));io.to(code).emit('minigame_start',{type:'reaction',players:pm});}
      else if(mg==='thisorthat'){startTot(room);io.to(code).emit('minigame_start',{type:'thisorthat',players:pm});io.to(code).emit('timer_start',{duration:90,label:'tot_create'});setT(code,90000,()=>{if(room.phase==='minigame_tot_create'){Object.keys(room.players).forEach(pid=>{if(!room.totItems.find(i=>i.playerId===pid))room.totItems.push({playerId:pid,playerName:room.players[pid]?.name||'?',situation:'(be situacijos)',optionA:'Taip',optionB:'Ne'});});startTotVoting(room);}});}
      else if(mg==='kim'){startKim(room);io.to(code).emit('minigame_start',{type:'kim',players:pm});io.to(code).emit('timer_start',{duration:90,label:'kim_create'});setT(code,90000,()=>{if(room.phase==='minigame_kim_create'){Object.keys(room.players).forEach(pid=>{if(!room.kimSubmissions[pid])room.kimSubmissions[pid]='Kas iš mūsų labiausiai bijo?';});startKimVoting(room);}});}
      else if(mg==='gtw'){startGtw(room);io.to(code).emit('minigame_start',{type:'gtw',players:pm});}
      else if(mg==='shop'){startShop(room);io.to(code).emit('minigame_start',{type:'shop',players:pm});io.to(code).emit('timer_start',{duration:120,label:'shop_create'});setT(code,120000,()=>{if(room.phase==='minigame_shop_create')startShopBuying(room);});}
      io.to(code).emit('room_update',getPublicRoom(room));
    }
  }

  function goNextOrEnd(room){advanceSequence(room);}


  // caption
  socket.on('caption_submit',({text})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_caption'||socket.id!==room.captionOrder[room.captionCurrentIdx]) return;
    clearT(code);
    room.captionParts.push({playerId:socket.id,playerName:room.players[socket.id]?.name||'?',text:text.trim().slice(0,200)||'...'});
    room.captionCurrentIdx++;
    const pm=pMap(room);
    io.to(code).emit('caption_update',{parts:room.captionParts,currentIdx:room.captionCurrentIdx,captionOrder:room.captionOrder,players:pm});
    if(room.captionCurrentIdx>=room.captionOrder.length){room.phase='minigame_caption_reveal';setTimeout(()=>io.to(code).emit('caption_reveal',{image:room.captionImage,parts:room.captionParts,players:pm}),800);}
    else advanceCaption(room);
  });
  socket.on('caption_done',()=>{const room=rooms[socket.data.roomCode];if(room&&socket.id===room.hostId)afterMinigame(room);});

  // reaction
  socket.on('reaction_submit',({text})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_reaction_write'||room.reactionTexts[socket.id]) return;
    room.reactionTexts[socket.id]=text.trim().slice(0,200);
    const done=Object.keys(room.reactionTexts).length,total=Object.keys(room.players).length;
    io.to(code).emit('reaction_progress',{done,total});
    if(done>=total){room.phase='minigame_reaction_reveal';room.reactionRevealIdx=0;setTimeout(()=>io.to(code).emit('reaction_reveal_next',reactionRevealPayload(room)),800);}
  });
  socket.on('reaction_next',()=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||socket.id!==room.hostId) return;
    room.reactionRevealIdx++;
    if(room.reactionRevealIdx>=room.reactionOrder.length)afterMinigame(room);
    else io.to(code).emit('reaction_reveal_next',reactionRevealPayload(room));
  });

  // thisorthat
  socket.on('tot_submit',({situation,optionA,optionB})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_tot_create'||room.totItems.find(i=>i.playerId===socket.id)) return;
    room.totItems.push({playerId:socket.id,playerName:room.players[socket.id]?.name||'?',situation:situation.trim().slice(0,200),optionA:optionA.trim().slice(0,80)||'Taip',optionB:optionB.trim().slice(0,80)||'Ne'});
    const done=room.totItems.length,total=Object.keys(room.players).length;
    io.to(code).emit('tot_progress',{done,total});
    if(done>=total){clearT(code);startTotVoting(room);}
  });
  socket.on('tot_vote',({choice})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_tot_vote'||room.totVotes[socket.id]!==undefined) return;
    const item=room.totItems[room.totCurrentIdx];
    if(item&&item.playerId===socket.id) return;
    room.totVotes[socket.id]=choice;broadcastTotVotes(room);
    const creator=item?.playerId;
    const eligible=Object.keys(room.players).filter(p=>p!==creator);
    if(eligible.filter(p=>room.totVotes[p]!==undefined).length>=eligible.length)advanceTot(room);
  });
  socket.on('tot_skip',()=>{const room=rooms[socket.data.roomCode];if(room&&socket.id===room.hostId)advanceTot(room);});
  socket.on('tot_done',()=>{const room=rooms[socket.data.roomCode];if(room&&socket.id===room.hostId)afterMinigame(room);});

  // kim
  socket.on('kim_submit',({text})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_kim_create'||room.kimSubmissions[socket.id]) return;
    room.kimSubmissions[socket.id]=text.trim().slice(0,200);
    const done=Object.keys(room.kimSubmissions).length,total=Object.keys(room.players).length;
    io.to(code).emit('kim_progress',{done,total});
    if(done>=total){clearT(code);startKimVoting(room);}
  });
  socket.on('kim_vote',({votedFor})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_kim_vote'||room.kimVotes[socket.id]!==undefined||!room.players[votedFor]) return;
    room.kimVotes[socket.id]=votedFor;
    const tally={};Object.values(room.kimVotes).forEach(vid=>{tally[vid]=(tally[vid]||0)+1;});
    io.to(code).emit('kim_vote_update',{tally,voted:Object.keys(room.kimVotes).length,total:Object.keys(room.players).length});
    if(Object.keys(room.kimVotes).length>=Object.keys(room.players).length)advanceKim(room);
  });
  socket.on('kim_done',()=>{const room=rooms[socket.data.roomCode];if(room&&socket.id===room.hostId)afterMinigame(room);});

  // gtw
  socket.on('gtw_set_word',({word})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_gtw_pick'||socket.id!==room.gtwAuthorId) return;
    const w=word.trim().slice(0,50);if(!w) return;
    room.gtwWord=w;clearT(code);startGtwGuessing(room);
  });
  socket.on('gtw_guess',({guess})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_gtw_guess'||socket.id===room.gtwAuthorId) return;
    const g=guess.trim().slice(0,100);if(!g) return;
    const correct=g.toLowerCase()===room.gtwWord.toLowerCase();
    const entry={playerId:socket.id,playerName:room.players[socket.id]?.name||'?',text:g,correct,ts:Date.now()};
    room.gtwGuesses.push(entry);io.to(code).emit('gtw_guess_update',{entry});
    if(correct){
      if(!room.gtwWinnersFirst.length){room.players[socket.id].score+=2;room.gtwWinnersFirst.push(socket.id);}
      else if(!room.gtwWinnersFirst.includes(socket.id)&&!room.gtwWinnersRest.includes(socket.id)){room.players[socket.id].score+=1;room.gtwWinnersRest.push(socket.id);}
      const guessers=Object.keys(room.players).filter(p=>p!==room.gtwAuthorId);
      if(guessers.every(p=>room.gtwWinnersFirst.includes(p)||room.gtwWinnersRest.includes(p)))endGtw(room);
    }
  });
  socket.on('gtw_done',()=>{const room=rooms[socket.data.roomCode];if(room&&socket.id===room.hostId)afterMinigame(room);});

  // shop
  socket.on('shop_submit_product',({name,price,description})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_shop_create') return;
    if(room.shopProducts.find(p=>p.sellerId===socket.id)) return;
    const p=Math.max(1,Math.min(999,parseInt(price)||10));
    room.shopProducts.push({sellerId:socket.id,sellerName:room.players[socket.id]?.name||'?',name:name.trim().slice(0,80),description:(description||'').trim().slice(0,150),price:p});
    room.shopSubmittedCount++;
    io.to(code).emit('shop_product_added',{products:room.shopProducts,submitted:room.shopSubmittedCount,total:Object.keys(room.players).length});
    if(room.shopSubmittedCount>=Object.keys(room.players).length){clearT(code);startShopBuying(room);}
  });
  socket.on('shop_buy',({sellerId,qty})=>{
    const code=socket.data.roomCode,room=rooms[code];
    if(!room||room.phase!=='minigame_shop_buy') return;
    const product=room.shopProducts.find(p=>p.sellerId===sellerId);
    if(!product) return;
    const cart=room.shopCart[socket.id];
    if(!cart) return;
    const q=Math.max(1,parseInt(qty)||1);
    const cost=product.price*q;
    if(cart.budget<cost) return;
    cart.budget-=cost;
    const existing=cart.purchases.find(p=>p.sellerId===sellerId);
    if(existing)existing.qty+=q;else cart.purchases.push({sellerId,sellerName:product.sellerName,name:product.name,price:product.price,qty:q});
    // send updated cart only to this player
    socket.emit('shop_cart_update',{budget:cart.budget,purchases:cart.purchases});
  });
  socket.on('shop_done',()=>{const room=rooms[socket.data.roomCode];if(room&&socket.id===room.hostId)afterMinigame(room);});

  socket.on('disconnect',()=>{
    const code=socket.data.roomCode;
    if(!code||!rooms[code]) return;
    const room=rooms[code];
    delete room.players[socket.id];delete room.playedCards[socket.id];delete room.votes[socket.id];
    delete room.playerEvents[socket.id];delete room.reactionTexts[socket.id];
    delete room.totVotes[socket.id];delete room.kimVotes[socket.id];delete room.kimSubmissions[socket.id];
    if(Object.keys(room.players).length===0){clearT(code);delete rooms[code];}
    else io.to(code).emit('room_update',getPublicRoom(room));
  });
});

const PORT=process.env.PORT||3000;
server.listen(PORT,()=>console.log(`MANO REAKCIJA KAI running on port ${PORT}`));
