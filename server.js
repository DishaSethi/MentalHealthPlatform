require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const session = require("express-session");
const chatRoutes = require("./routes/chatbotRoutes");
const { handleUserMessage } = require("./controllers/chatbotController");
const sharedSession = require("express-socket.io-session");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000", credentials: true } });


mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));
// Express session middleware
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "super_secret_key",
    resave: false,
    saveUninitialized:false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI ,
        ttl: 60*30, // Sessions expire in 1 day
        autoRemove: "interval",
        autoRemoveInterval: 10, // Cleanup every 10 minutes
    }),
    cookie: {
        secure: true, // Set to `true` in production with HTTPS
        httpOnly: true,
        maxAge: 60*35* 1000, // 1 day
    },
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

// app.use((req, res, next) => {
//     if (req.originalUrl === "/chat") {
//       console.log("Current Session ID:", req.sessionID);
  
//       if (!req.session.previousSessionId) {
//         req.session.previousSessionId = req.sessionID; // Store initial session ID
//       } else if (req.session.previousSessionId !== req.sessionID) {
//         console.log("Page refreshed! Resetting session...");
        
//         // Destroy the current session and reload
//         req.session.destroy(err => {
//           if (err) {
//             console.error("Error destroying session:", err);
//             return next();
//           }
//           req.session = null;
//           res.clearCookie("connect.sid");
//           res.redirect("/chat"); // Force a reload with a new session
//         });
  
//         return;
//       }
//     }
    
//     next();
//   });
  
  
// Use chat routes (For REST API access)
app.use("/api", chatRoutes);
const PORT = process.env.PORT || 5000; 
// Start the server
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
