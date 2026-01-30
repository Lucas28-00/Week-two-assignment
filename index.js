const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname)));

const wss = new WebSocketServer({ server, path: '/signaling' });

const rooms = new Map(); // room -> Set<ws>

function joinRoom(ws, room){
  ws.room = room;
  if(!rooms.has(room)) rooms.set(room, new Set());
  const set = rooms.get(room);
  set.add(ws);
  const size = set.size;
  ws.send(JSON.stringify({ type: 'joined', initiator: size === 1 }));
  if(size > 1){
    set.forEach(client=>{
      if(client !== ws && client.readyState === 1){
        client.send(JSON.stringify({ type: 'peer-joined' }));
      }
    });
  }
}

function leaveRoom(ws){
  const room = ws.room;
  if(!room) return;
  const set = rooms.get(room);
  if(!set) return;
  set.delete(ws);
  if(set.size === 0) rooms.delete(room);
  else {
    set.forEach(client=>{
      if(client.readyState === 1){
        client.send(JSON.stringify({ type: 'peer-left' }));
      }
    });
  }
}

wss.on('connection', (ws)=>{
  ws.on('message', (raw)=>{
    let msg; try{ msg = JSON.parse(raw.toString()); }catch(e){ return; }
    if(msg.type === 'join' && msg.room){
      joinRoom(ws, msg.room);
      return;
    }
    if(msg.type === 'signal' && msg.room && msg.data){
      const set = rooms.get(msg.room);
      if(!set) return;
      set.forEach(client=>{
        if(client !== ws && client.readyState === 1){
          client.send(JSON.stringify({ type: 'signal', data: msg.data }));
        }
      });
    }
  });
  ws.on('close', ()=> leaveRoom(ws));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>{
  console.log(`AnyTalk server listening on http://localhost:${PORT}`);
});
