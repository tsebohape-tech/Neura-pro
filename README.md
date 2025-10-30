
# Neura Typing Demo with Gemini API

This project is a minimal, self-contained demonstration of how to create a ChatGPT-like streaming text effect using the Gemini API. It features a Node.js/Express backend that proxies requests and a vanilla HTML/CSS/JS frontend that renders the typing animation.

## Features

-   **Streaming Text**: Real-time text generation with a smooth typing animation.
-   **Markdown Rendering**: Progressively renders markdown as the text streams in.
-   **Punctuation-Aware Pauses**: Creates a more natural typing rhythm by pausing longer after punctuation.
-   **Controls**: Includes a "Stop" button, a typing speed slider, and a non-streaming fallback option.
-   **Backend Proxy**: A simple Express server that securely handles the Gemini API key and streams data to the client using Server-Sent Events (SSE).
-   **Zero Build Tools**: The frontend is a single `index.html` file with no bundlers or frameworks required.

## How It Works

1.  The frontend captures a user's prompt and sends it to the local Express server at `/api/stream`.
2.  The `server.js` backend receives the prompt and makes a streaming request to the Gemini API.
3.  As the Gemini API returns chunks of text, the server formats them into Server-Sent Events (`data: {"text":"..."}\n\n`) and writes them to the response stream.
4.  The frontend reads the SSE stream, buffers the incoming text, and uses `requestAnimationFrame` to animate the typing effect character by character into a `<div>`.
5.  The content of the `<div>` is passed to the `marked.js` library on each frame to render markdown in real-time.

## Setup and Installation

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   npm (included with Node.js)
-   A Gemini API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Step 1: Clone the Repository

Clone this project to your local machine.

```bash
git clone <repository-url>
cd neura-typing-demo
```

### Step 2: Install Dependencies

Install the required Node.js packages.

```bash
npm install
```

### Step 3: Configure Environment Variables

Create a `.env` file by copying the example file.

```bash
cp .env.example .env
```

Now, open the newly created `.env` file in a text editor and replace `"YOUR_GEMINI_API_KEY_HERE"` with your actual Gemini API key.

```
GEMINI_API_KEY="AIzaSy...your...key...here"
PORT=3000
```

### Step 4: Run the Server

Start the backend server.

```bash
npm start
```

You should see the following output in your terminal:

```
Server listening at http://localhost:3000
Ensure your .env file is configured with your GEMINI_API_KEY.
```

### Step 5: Open the Demo

Open your web browser and navigate to **http://localhost:3000**. You can now use the demo application.
