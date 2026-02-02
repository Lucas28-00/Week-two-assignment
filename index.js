const path = require('path');
const http = require('http');
const express = require('express');
const { WebSocketServer } = require('ws');
const twilio = require('twilio');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

app.use(express.static(path.join(__dirname)));
app.use(express.json());

const {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_VOICE_FROM,
  TWILIO_WHATSAPP_FROM,
  PUBLIC_BASE_URL
} = process.env;

const hasTwilio = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN);
const voiceEnabled = hasTwilio && !!TWILIO_VOICE_FROM;
const whatsappEnabled = hasTwilio && !!TWILIO_WHATSAPP_FROM;
const twilioClient = hasTwilio ? twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) : null;

function normalizeE164(value){
  const digits = String(value || '').replace(/\D/g, '');
  if(!digits) return '';
  return `+${digits}`;
}

function requirePublicBaseUrl(req){
  if(PUBLIC_BASE_URL) return PUBLIC_BASE_URL.replace(/\/$/, '');
  const host = req.get('host');
  const proto = req.protocol;
  if(!host) return '';
  return `${proto}://${host}`;
}

app.get('/api/config', (req, res)=>{
  res.json({
    voiceEnabled,
    whatsappEnabled
  });
});

app.post('/api/whatsapp', async (req, res)=>{
  if(!whatsappEnabled){
    return res.status(400).json({ error: 'WhatsApp is not configured.' });
  }
  const to = normalizeE164(req.body?.to);
  const message = String(req.body?.message || '').trim();
  if(!to || !message){
    return res.status(400).json({ error: 'Missing to or message.' });
  }
  try{
    const result = await twilioClient.messages.create({
      from: `whatsapp:${normalizeE164(TWILIO_WHATSAPP_FROM)}`,
      to: `whatsapp:${to}`,
      body: message
    });
    return res.json({ sid: result.sid });
  }catch(err){
    return res.status(500).json({ error: 'Failed to send WhatsApp message.' });
  }
});

app.get('/api/voice-bridge', (req, res)=>{
  const room = String(req.query.room || '').trim();
  if(!room){
    return res.status(400).type('text/plain').send('Missing room');
  }
  const voiceResponse = new twilio.twiml.VoiceResponse();
  const dial = voiceResponse.dial();
  dial.conference(room, { startConferenceOnEnter: true, endConferenceOnExit: true });
  res.type('text/xml').send(voiceResponse.toString());
});

app.post('/api/voice-call', async (req, res)=>{
  if(!voiceEnabled){
    return res.status(400).json({ error: 'Voice calling is not configured.' });
  }
  const to = normalizeE164(req.body?.to);
  const user = normalizeE164(req.body?.user);
  if(!to){
    return res.status(400).json({ error: 'Missing destination number.' });
  }
  const baseUrl = requirePublicBaseUrl(req);
  if(!baseUrl || baseUrl.includes('localhost')){
    return res.status(400).json({ error: 'PUBLIC_BASE_URL must be set to a public URL for Twilio callbacks.' });
  }
  const room = `anytalk-${Date.now()}`;
  const bridgeUrl = `${baseUrl}/api/voice-bridge?room=${encodeURIComponent(room)}`;
  try{
    const calls = [];
    if(user){
      calls.push(twilioClient.calls.create({
        to: user,
        from: normalizeE164(TWILIO_VOICE_FROM),
        url: bridgeUrl
      }));
    }
    calls.push(twilioClient.calls.create({
      to,
      from: normalizeE164(TWILIO_VOICE_FROM),
      url: bridgeUrl
    }));
    const results = await Promise.all(calls);
    return res.json({ sids: results.map(r=>r.sid), room });
  }catch(err){
    return res.status(500).json({ error: 'Failed to start voice call.' });
  }
});

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
