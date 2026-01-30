(function(){
  const TYPE_KEY = 'anytalk_user_type';
  const PHONE_KEY = 'anytalk_phone';
  const LANG_KEY = 'anytalk_lang';
  const CODE_KEY = 'anytalk_country_code';
  const HISTORY_KEY = 'anytalk_call_history';

  const modeEl = document.getElementById('mode-label');
  const phoneEl = document.getElementById('phone-display');
  const micSection = document.getElementById('mic-section');
  const textSection = document.getElementById('text-section');
  const captionBox = document.getElementById('captions');
  const chatBox = document.getElementById('chat-box');
  const startMicBtn = document.getElementById('start-mic');
  const stopMicBtn = document.getElementById('stop-mic');
  const sendBtn = document.getElementById('send-text');
  const textInput = document.getElementById('text-input');
  const speakToggle = document.getElementById('speak-toggle');
  const callCodeSelect = document.getElementById('call-country-code');
  const callNumberInput = document.getElementById('call-number');
  const connectBtn = document.getElementById('connect-call');
  const callStatus = document.getElementById('call-status');
  const remoteAudio = document.getElementById('remote-audio');
  const historyBox = document.getElementById('call-history');

  const type = localStorage.getItem(TYPE_KEY);
  const phone = localStorage.getItem(PHONE_KEY) || 'Not provided';
  const storedLang = localStorage.getItem(LANG_KEY) || 'en-GB';
  localStorage.setItem(LANG_KEY, storedLang);
  const storedCode = localStorage.getItem(CODE_KEY) || '+256';
  if(callCodeSelect){
    callCodeSelect.value = storedCode;
  }
  if(callNumberInput && phone && phone !== 'Not provided'){
    callNumberInput.value = phone;
  }

  if(modeEl) modeEl.textContent = type === 'deaf' ? 'Deaf / Hard of hearing' : 'Hearing';
  if(phoneEl) phoneEl.textContent = phone;

  if(type === 'deaf'){
    if(micSection) micSection.style.display = 'none';
    if(textSection) textSection.style.display = 'block';
  } else {
    if(micSection) micSection.style.display = 'block';
    if(textSection) textSection.style.display = 'block';
  }

  function addMessage(who, text){
    const row = document.createElement('div');
    row.textContent = `${who}: ${text}`;
    row.style.padding = '0.25rem 0';
    chatBox.appendChild(row);
    chatBox.scrollTop = chatBox.scrollHeight;
  }

  function speak(text){
    if(!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = localStorage.getItem(LANG_KEY) || 'en-GB';
    window.speechSynthesis.speak(u);
  }

  // --- WebRTC calling ---
  let ws = null;
  let pc = null;
  let dc = null;
  let roomId = null;
  let isInitiator = false;

  function setStatus(text){ if(callStatus) callStatus.textContent = text; }

  function loadHistory(){
    try{ return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }catch(e){ return []; }
  }

  function saveHistory(list){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 10)));
  }

  function renderHistory(){
    if(!historyBox) return;
    historyBox.innerHTML = '';
    const list = loadHistory();
    if(list.length === 0){
      historyBox.textContent = 'No calls yet.';
      return;
    }
    list.forEach(item=>{
      const row = document.createElement('div');
      row.style.padding = '0.25rem 0';
      row.textContent = `${item.when} — ${item.number}`;
      historyBox.appendChild(row);
    });
  }

  function addHistory(number){
    const list = loadHistory();
    const when = new Date().toLocaleString();
    list.unshift({ number, when });
    saveHistory(list);
    renderHistory();
  }

  function normalizeRoom(){
    const code = (callCodeSelect?.value || '+256');
    const num = (callNumberInput?.value || '').trim();
    const full = `${code}${num}`.replace(/\D/g, '');
    return full;
  }

  function sendSignal(data){
    if(ws && ws.readyState === 1){
      ws.send(JSON.stringify({ type: 'signal', room: roomId, data }));
    }
  }

  async function createPeer(){
    if(pc) return;
    pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

    pc.onicecandidate = (e)=>{ if(e.candidate) sendSignal({ ice: e.candidate }); };
    pc.ontrack = (e)=>{ if(remoteAudio) remoteAudio.srcObject = e.streams[0]; };

    pc.ondatachannel = (e)=>{
      dc = e.channel;
      dc.onmessage = (ev)=> handleDataMessage(ev.data);
    };

    if(type !== 'deaf'){
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t=> pc.addTrack(t, stream));
      }catch(err){
        console.warn('Microphone access failed', err);
      }
    }

    if(isInitiator){
      dc = pc.createDataChannel('chat');
      dc.onmessage = (ev)=> handleDataMessage(ev.data);
    }
  }

  async function makeOffer(){
    await createPeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ sdp: pc.localDescription });
  }

  async function handleSignal(data){
    if(data.sdp){
      await createPeer();
      await pc.setRemoteDescription(data.sdp);
      if(data.sdp.type === 'offer'){
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ sdp: pc.localDescription });
      }
    }
    if(data.ice){
      try{ await pc.addIceCandidate(data.ice); }catch(e){}
    }
  }

  function handleDataMessage(raw){
    let msg = null;
    try{ msg = JSON.parse(raw); }catch(e){ msg = { type: 'text', text: String(raw) }; }
    if(msg.type === 'text'){
      addMessage('Remote', msg.text);
      if(type === 'hearing' && speakToggle.checked){
        speak(msg.text);
      }
      if(captionBox) captionBox.textContent = msg.text;
    }
  }

  async function connectCall(){
    roomId = normalizeRoom();
    if(!roomId){
      alert('Enter a phone number to start the call.');
      return;
    }
    addHistory(`+${roomId}`);
    setStatus('Connecting…');
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/signaling`);
    ws.onopen = ()=>{ ws.send(JSON.stringify({ type: 'join', room: roomId })); };
    ws.onmessage = async (ev)=>{
      let msg; try{ msg = JSON.parse(ev.data); }catch(e){ return; }
      if(msg.type === 'joined'){
        isInitiator = !!msg.initiator;
        setStatus(isInitiator ? 'Waiting for peer…' : 'Connected.');
      }
      if(msg.type === 'peer-joined' && isInitiator){
        setStatus('Peer joined. Starting call…');
        await makeOffer();
      }
      if(msg.type === 'signal'){
        setStatus('In call');
        await handleSignal(msg.data);
      }
      if(msg.type === 'peer-left'){
        setStatus('Peer left');
      }
    };
    ws.onclose = ()=> setStatus('Disconnected');
  }

  // Speech recognition for hearing users (voice -> text)
  let recognition = null;
  function startRecognition(){
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition){
      alert('SpeechRecognition is not supported in this browser.');
      return;
    }
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = localStorage.getItem(LANG_KEY) || 'en-GB';
    recognition.onresult = (ev)=>{
      let interim = '';
      let finalText = '';
      for(let i = ev.resultIndex; i < ev.results.length; ++i){
        const r = ev.results[i];
        if(r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      const shown = interim || finalText;
      if(shown) captionBox.textContent = shown;
      if(finalText){
        const clean = finalText.trim();
        addMessage('You (speech)', clean);
        if(dc && dc.readyState === 'open'){
          try{ dc.send(JSON.stringify({ type: 'text', text: clean })); }catch(e){}
        }
      }
    };
    recognition.onerror = (e)=> console.warn('SpeechRecognition error', e);
    recognition.start();
  }

  function stopRecognition(){
    if(recognition){
      try{ recognition.stop(); }catch(e){}
      recognition = null;
    }
  }

  startMicBtn?.addEventListener('click', ()=>{
    if(type === 'deaf') return;
    startRecognition();
  });

  stopMicBtn?.addEventListener('click', ()=> stopRecognition());



  sendBtn?.addEventListener('click', ()=>{
    const text = (textInput.value || '').trim();
    if(!text) return;
    addMessage('You (text)', text);
    if(type === 'deaf' || speakToggle.checked){
      speak(text);
    }
    if(dc && dc.readyState === 'open'){
      try{ dc.send(JSON.stringify({ type: 'text', text })); }catch(e){}
    }
    textInput.value = '';
  });

  textInput?.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      sendBtn.click();
    }
  });

  callCodeSelect?.addEventListener('change', ()=>{
    localStorage.setItem(CODE_KEY, callCodeSelect.value || '+256');
  });

  renderHistory();

  connectBtn?.addEventListener('click', ()=>{
    connectCall();
  });
})();
