require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const session = require("express-session");
const chatRoutes = require("./routes/chatbotRoutes");
const { handleUserMessage } = require("./controllers/chatbotController");
const sharedSession = require("express-socket.io-session");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000", credentials: true } });

// Express session middleware
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "super_secret_key",
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // Change to true in production (HTTPS)
        httpOnly: true,
        maxAge: null,  // No expiration (Incognito mode)
    }
});

// Apply session middleware to Express
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);

// Apply session middleware to WebSocket connections
io.use(sharedSession(sessionMiddleware, { autoSave: true }));

// Function to generate a random session ID
const generateSessionId = () => Math.random().toString(36).substring(2, 15);

// Handle WebSocket connections
io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    // Access session in WebSocket
    const userSession = socket.handshake.session;

    // Generate and store a session ID if it doesn't exist
    if (!userSession.sessionId) {
        userSession.sessionId = generateSessionId();
    }

    console.log("📌 Session ID:", userSession.sessionId);

    // Send session ID to frontend
    socket.emit("sessionId", userSession.sessionId);

    socket.on("userMessage", async (message) => {
        console.log("📩 Message received from client:", message);

        // Store message in session
        if (!userSession.messages) {
            userSession.messages = [];
        }
        userSession.messages.push(message);

        // Handle message processing
        await handleUserMessage(socket, message);
    });

    socket.on("disconnect", () => {
        console.log("⚠️ User disconnected:", socket.id);
    });
});

// Use chat routes (For REST API access)
app.use("/api", chatRoutes);

// Start the server
server.listen(5000, () => console.log("🚀 Server running on port 5000"));
