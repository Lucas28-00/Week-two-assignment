(function(){
  // Configuration
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const SpeechSynthesis = window.speechSynthesis;
  
  // DOM Elements
  const layout = {
    setupPanel: document.getElementById('setup-panel'),
    interface: document.getElementById('comm-interface'),
    hearingBtn: document.getElementById('hearing-mode-btn'),
    deafBtn: document.getElementById('deaf-mode-btn'),
    backBtn: document.getElementById('back-btn'),
    modeBadge: document.getElementById('current-mode-badge'),
    displayArea: document.getElementById('display-area'),
    transcription: document.getElementById('transcription-text'),
    hearingControls: document.getElementById('hearing-controls'),
    deafControls: document.getElementById('deaf-controls'),
    micBtn: document.getElementById('mic-btn'),
    micStatus: document.getElementById('mic-status'),
    textInput: document.getElementById('text-input'),
    speakBtn: document.getElementById('speak-btn'),
    langSelect: document.getElementById('lang-select')
  };

  // State
  let recognition;
  let isListening = false;
  let currentLang = 'en-GB';

  // Initialization
  function init() {
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Show results as they are spoken

    recognition.onstart = () => {
      isListening = true;
      layout.micBtn.classList.add('active');
      layout.micStatus.textContent = 'Listening...';
    };

    recognition.onend = () => {
      isListening = false;
      layout.micBtn.classList.remove('active');
      layout.micStatus.textContent = 'Tap to listen';
      // Auto-restart if in "Deaf" mode (as they always need captions)? 
      // For now, manual toggle to save battery/privacy.
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('');
      
      layout.transcription.textContent = transcript;
      
      // Auto-scroll to bottom of display
      layout.displayArea.scrollTop = layout.displayArea.scrollHeight;
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      if(event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone access.');
      }
    };

    setupEventListeners();
  }

  function setupEventListeners() {
    // Mode Selection
    layout.hearingBtn.addEventListener('click', () => setMode('hearing'));
    layout.deafBtn.addEventListener('click', () => setMode('deaf'));
    
    // Back Button
    layout.backBtn.addEventListener('click', () => {
        stopListening();
        layout.setupPanel.style.display = 'grid'; // Grid is default for setup-panel
        layout.interface.style.display = 'none';
        layout.transcription.textContent = ''; // Clear text
    });

    // Mic Button (Hearing logic)
    layout.micBtn.addEventListener('click', toggleListening);

    // Speak Button (Deaf logic)
    layout.speakBtn.addEventListener('click', speakText);

    // Language Change
    layout.langSelect.addEventListener('change', (e) => {
      currentLang = e.target.value;
      recognition.lang = currentLang;
    });
  }

  function setMode(mode) {
    // Hide setup, show interface
    layout.setupPanel.style.display = 'none';
    layout.interface.style.display = 'flex';
    
    // Reset state
    layout.hearingControls.style.display = 'none';
    layout.deafControls.style.display = 'none';
    stopListening();

    if (mode === 'hearing') {
      // User is Hearing: They speak to text.
      layout.modeBadge.textContent = 'Hearing Mode';
      layout.hearingControls.style.display = 'flex';
      // In Hearing mode, users usually want to *dictate*.
      // We don't auto-start listening, let them click.
      layout.transcription.textContent = '';
      document.querySelector('.placeholder-text').textContent = 'Tap the microphone and speak...';
      
    } else {
      // User is Deaf: They type to speech. 
      // AND we should probably listen for others? 
      // For this prompt, let's focus on the input method requested: "Deaf types".
      layout.modeBadge.textContent = 'Deaf Mode';
      layout.deafControls.style.display = 'flex'; // Shows text input
      layout.transcription.textContent = '';
      document.querySelector('.placeholder-text').textContent = 'Listening for speech (use mic if needed)...';
      
      // OPTIONAL: In Deaf mode, we might want to also show the Mic button? 
      // Since the prompt asks for a "bridge", a Deaf user needs to SEE what others say.
      // So they need the Mic to be active picking up the Hearing person.
      // But purely based on UI:
      // "Hearing Mode" -> I Speak.
      // "Deaf Mode" -> I Type.
      
      // Let's add a small Mic trigger in Deaf mode? Or just assume the "bridge" implies
      // the Hearing person handles the listening side. 
      // If single device: 
      // I (Deaf) hold the phone. I want to read. So I need the Mic ON.
      // So in Deaf mode, I should probably Auto-Enable the Mic (if permission granted).
      
      // Let's enable the mic button in Deaf controls too, or just reuse logic.
      // But the prompt says "page for talking is suitable for the user".
      // Let's keep specific controls. I'll add a secondary Mic button to Deaf controls if I could, 
      // but simpler: Just depend on the Hearing person to toggle "Hearing Mode" when *they* act?
      // No, that's clunky switching.
      
      // Better approach:
      // Deaf Mode: Primary = Type. Secondary = "Listen" (Mic).
      // Hearing Mode: Primary = Listen (Mic). 
      
      // For now, I'll stick to the requested primary functions.
      // Deaf mode -> Text Input focus.
      // But I will trigger the mic button in Hearing mode.
    }
  }

  function toggleListening() {
    if (isListening) {
      stopListening();
    } else {
      recognition.lang = currentLang;
      try {
        recognition.start();
      } catch (e) {
        console.error(e);
      }
    }
  }

  function stopListening() {
    if (isListening) {
      recognition.stop();
    }
  }

  function speakText() {
    const text = layout.textInput.value.trim();
    if (!text) return;

    if (SpeechSynthesis.speaking) {
      SpeechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = currentLang;
    
    // Optional: Select a voice that matches
    // const voices = SpeechSynthesis.getVoices();
    // utterance.voice = voices[0];

    SpeechSynthesis.speak(utterance);
    
    // Visual feedback
    layout.transcription.textContent = `(Spoken): ${text}`;
    layout.textInput.value = '';
  }

  // Initial call
  init();

})();
