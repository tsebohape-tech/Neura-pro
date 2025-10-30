// server.js
// Neura Typing Demo - Backend Server

// Load environment variables from .env file
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Middleware Setup ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON request bodies
app.use(express.static('public')); // Serve static files from the 'public' directory

// --- Validation Middleware ---
const validateRequest = (req, res, next) => {
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
  }
  if (!req.body.prompt || typeof req.body.prompt !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid "prompt" in request body.' });
  }
  next();
};

// --- Streaming Endpoint (/api/stream) ---
app.post('/api/stream', validateRequest, async (req, res) => {
  const { prompt } = req.body;

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // Flush headers to establish the connection

  /*
   * =========================================================================
   * DEVELOPER NOTE: Gemini API Integration
   * =========================================================================
   *
   * This is where you would integrate the real Gemini SDK. Below are two
   * patterns: a pseudo-SDK example and a direct HTTP fetch example.
   * This demo uses the direct HTTP fetch pattern.
   *
   * To use the official SDK, you would replace the HTTP logic with this:
   *
   * // --- PATTERN 1: Using @google/genai SDK (Recommended) ---
   *
   * // 1. Install the SDK: npm install @google/genai
   * // 2. Import and initialize
   * const { GoogleGenAI } = require("@google/genai");
   * const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
   *
   * // 3. Use the streaming method within this endpoint
   * try {
   *   const responseStream = await ai.models.generateContentStream({
   *     model: "gemini-2.5-flash", // Or your preferred model
   *     contents: prompt,
   *   });
   *
   *   for await (const chunk of responseStream) {
   *     // The official SDK provides a .text accessor
   *     const text = chunk.text;
   *     if (text) {
   *       const sseData = { text };
   *       res.write(`data: ${JSON.stringify(sseData)}\n\n`);
   *     }
   *   }
   *   res.end(); // End the stream when done
   * } catch (error) {
   *   console.error("Gemini SDK Stream Error:", error);
   *   res.write(`data: ${JSON.stringify({ error: "An error occurred with the AI service." })}\n\n`);
   *   res.end();
   * }
   */


  // --- PATTERN 2: Direct HTTP Fetch (Implemented in this demo) ---
  const geminiPayload = {
    contents: [{ parts: [{ text: prompt }] }],
    // Add other generationConfig settings here if needed
  };

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };

  const geminiRequest = https.request(options, (geminiResponse) => {
    let buffer = '';
    geminiResponse.on('data', (chunk) => {
      buffer += chunk.toString();
      
      // Process all complete newline-separated chunks in the buffer
      let boundary;
      while ((boundary = buffer.indexOf('\n')) !== -1) {
        const jsonString = buffer.substring(0, boundary).trim();
        buffer = buffer.substring(boundary + 1);

        if (jsonString.length === 0) continue;

        try {
          // The Gemini stream is a series of JSON objects. It's NOT in SSE format.
          // We need to parse each JSON object, extract the text, and THEN format it as an SSE for the client.
          const parsed = JSON.parse(jsonString);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;

          if (text) {
            const sseData = { text };
            // Format as a Server-Sent Event and send it to the client
            res.write(`data: ${JSON.stringify(sseData)}\n\n`);
          }
        } catch (error) {
          // This can happen with incomplete JSON chunks. The buffer handles this by waiting for the next 'data' event.
          // We can log this for debugging if needed, but it's often not a critical error.
          // console.error('Could not parse JSON chunk from Gemini:', jsonString);
        }
      }
    });

    geminiResponse.on('end', () => {
      console.log('Gemini stream finished.');
      res.end();
    });
  });

  geminiRequest.on('error', (error) => {
    console.error('Error with Gemini API request:', error);
    res.write(`data: ${JSON.stringify({ error: "Failed to connect to the AI service." })}\n\n`);
    res.end();
  });

  geminiRequest.write(JSON.stringify(geminiPayload));
  geminiRequest.end();

  // Handle client disconnect
  req.on('close', () => {
    console.log('Client disconnected.');
    geminiRequest.destroy(); // Clean up the connection to Gemini
    res.end();
  });
});

// --- Non-Streaming Fallback Endpoint (/api/complete) ---
app.post('/api/complete', validateRequest, async (req, res) => {
  const { prompt } = req.body;

  /*
   * DEVELOPER NOTE: This would be a non-streaming SDK call, like:
   * const response = await ai.models.generateContent({ ... });
   * res.json({ text: response.text });
   */

  const geminiPayload = {
    contents: [{ parts: [{ text: prompt }] }],
  };

  const options = {
    hostname: 'generativelanguage.googleapis.com',
    path: `/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  };

  let responseData = '';
  const geminiRequest = https.request(options, (geminiResponse) => {
    geminiResponse.on('data', (chunk) => responseData += chunk);
    geminiResponse.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          res.json({ text });
        } else {
          console.error("Invalid Gemini Response Structure:", responseData);
          res.status(500).json({ error: "Could not parse AI response." });
        }
      } catch (e) {
        console.error("JSON Parsing Error:", e);
        res.status(500).json({ error: "Error parsing AI response." });
      }
    });
  });

  geminiRequest.on('error', (error) => {
    console.error('Error with Gemini API request:', error);
    res.status(500).json({ error: "Failed to connect to the AI service." });
  });

  geminiRequest.write(JSON.stringify(geminiPayload));
  geminiRequest.end();
});

// --- Server Start ---
app.listen(PORT, () => {
  console.log(`Server listening at http://localhost:${PORT}`);
  console.log('Ensure your .env file is configured with your GEMINI_API_KEY.');
});