# AnyTalk — Week Two Assignment

AnyTalk is a browser-first prototype that helps deaf and hearing people communicate using speech-to-text and text-to-speech. Visitors choose whether they can hear when they arrive, and the call experience adapts:

- Hearing users: microphone → captions (speech-to-text)
- Deaf/Hard of hearing users: typed text → spoken audio (text-to-speech)
- Text-to-text and speech-to-speech are supported in the interface

## What’s included

- Animated, themeable home page with language picker (default: UK English)
- Hearing/deaf selection stored in localStorage
- Country calling code selector (default: Uganda +256)
- Call page with WebRTC connect button, chat transcript, and call history panel
- Logo + favicon

## How to run

Install dependencies and run the signaling server (required for WebRTC calling):

```bash
npm install
npm start
```

Then open http://localhost:3000 in two browsers/devices, choose hearing status, and use the same full phone number (country code + number) so both clients join the same call room.

> Note: SpeechRecognition and SpeechSynthesis depend on browser support (Chrome/Edge recommended).

## Files

- index.html — home page and hearing/deaf selection
- call.html — call experience with mic or chat, connect button, call history
- styles.css — themes and motion animation
- theme.js — theme switching
- app.js — home page logic
- call.js — call page logic
- logo.svg, favicon.svg — branding assets

## Notes about calling

- The “phone number” is used as a shared room ID for WebRTC signaling. It does not place real PSTN calls.
- For real phone calls, you would need a telephone provider (e.g., Twilio) and server-side PSTN integration.
- Call history is saved locally in the browser (last 10 entries).

## Roadmap (optional)

- Real calling with phone numbers (PSTN/SIP integration)
- WebRTC captions across remote peers
- Secure account system and profile preferences
