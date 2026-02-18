# AnyTalk — Communication Bridge (Week Two Assignment)

AnyTalk is an accessible communication tool that bridges the gap between hearing and deaf individuals. It provides a real-time speech-to-text and text-to-speech interface, running entirely in the browser.

## Features

- **Hearing Mode**: Speak into the microphone, and the app displays your words as large, readable text for a deaf partner.
- **Deaf Mode**: Type your message, and the app speaks it aloud for a hearing partner.
- **Single-Device Bridge**: designed to be used on a single device passed between users or shared in a conversation.
- **Visual Design**: Animated themes, clear typography, and responsive interface.

## How to use

1. Open the application in a modern browser (Chrome, Edge, or Safari).
2. Select your role:
   - **I can hear**: Use the microphone to speak. The app will transcribe your voice.
   - **I am Deaf / HoH**: Use the text input to type. The app will speak your message.
3. Switch modes easily with the "Change Mode" button.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local server:
   ```bash
   npm start
   ```

3. Open your browser at `http://localhost:3000`.

## Technology

- **HTML5 & CSS3**: Custom responsive design with CSS variables for theming.
- **JavaScript (ES6+)**: Logic for UI state and Web APIs.
- **Web Speech API**:
  - `SpeechRecognition`: For converting speech to text.
  - `SpeechSynthesis`: For converting text to speech.
- **Node.js**: Simple static file server (Express).

## Accessibility

The application is designed with high contrast text, large touch targets, and clear visual indicators for active states (e.g., listening mode).
