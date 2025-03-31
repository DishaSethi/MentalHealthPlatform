// require("dotenv").config();
// const express = require("express");
// const http = require("http");
// const { Server } = require("socket.io");
// const cors = require("cors");
// const session = require("express-session");
// const chatRoutes = require("./routes/chatbotRoutes");
// const { handleUserMessage } = require("./controllers/chatbotController");
// const sharedSession = require("express-socket.io-session");

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, { cors: { origin:  " https://mentalhealthfrontend.onrender.com", credentials: true } });

// // Express session middleware
// const sessionMiddleware = session({
//     secret: process.env.SESSION_SECRET || "super_secret_key",
//     resave: false,
//     saveUninitialized: true,
//     store: null,
//     cookie: {
//         secure: false, // Change to true in production (HTTPS)
//         httpOnly: true,
//         maxAge: null,  // No expiration (Incognito mode)
//     }
// });

// // Apply session middleware to Express
// app.use(cors({ origin: "https://mentalhealthfrontend.onrender.com", credentials: true,
//   methods: ["GET", "POST", "PUT", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"]
//  }));
// app.use(express.json());
// app.use(sessionMiddleware);

// // Apply session middleware to WebSocket connections
// io.use(sharedSession(sessionMiddleware, { autoSave: true }));

// // Function to generate a random session ID
// const generateSessionId = () => Math.random().toString(36).substring(2, 15);

// // Handle WebSocket connections
// io.on("connection", (socket) => {
//     console.log("✅ User connected:", socket.id);

//     // Access session in WebSocket
//     const userSession = socket.handshake.session;

//     // Generate and store a session ID if it doesn't exist
//     if (!userSession.sessionId) {
//         userSession.sessionId = generateSessionId();
//     }

//     console.log("📌 Session ID:", userSession.sessionId);

//     // Send session ID to frontend
//     socket.emit("sessionId", userSession.sessionId);

//     socket.on("userMessage", async (message) => {
//         console.log("📩 Message received from client:", message);

//         // Store message in session
//         if (!userSession.messages) {
//             userSession.messages = [];
//         }
//         userSession.messages.push(message);

//         // Handle message processing
//         await handleUserMessage(socket, message);
//     });

//     socket.on("disconnect", () => {
//         console.log("⚠️ User disconnected:", socket.id);
//     });
// });

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
  
  
// // Use chat routes (For REST API access)
// app.use("/api", chatRoutes);
// const PORT = process.env.PORT || 5000; 
// // Start the server
// server.listen(PORT, () => {
//     console.log(`🚀 Server running on port ${PORT}`);
// });
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
const io = new Server(server, { 
    cors: { 
        origin: "https://mentalhealthfrontend.onrender.com", 
        methods: ["GET", "POST"],  // ✅ Allow API calls
        credentials: true 
    } 
});

// ✅ Enable CORS for Express API
app.use(cors({ 
    origin: "https://mentalhealthfrontend.onrender.com",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true 
}));

// ✅ Apply CORS headers dynamically
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://mentalhealthfrontend.onrender.com");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Credentials", "true");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    next();
});

// ✅ Express session middleware
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET || "super_secret_key",
    resave: false,
    saveUninitialized: true,
    store: null,
    cookie: {
        secure: false,  // Change to true if using HTTPS
        httpOnly: true,
        maxAge: null
    }
});
app.use(express.json());
app.use(sessionMiddleware);

// ✅ Apply session middleware to WebSocket
io.use(sharedSession(sessionMiddleware, { autoSave: true }));

// ✅ Function to generate a random session ID
const generateSessionId = () => Math.random().toString(36).substring(2, 15);

// ✅ Handle WebSocket connections
io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    const userSession = socket.handshake.session;

    if (!userSession.sessionId) {
        userSession.sessionId = generateSessionId();
    }

    console.log("📌 Session ID:", userSession.sessionId);
    socket.emit("sessionId", userSession.sessionId);

    socket.on("userMessage", async (message) => {
        console.log("📩 Message received from client:", message);

        if (!userSession.messages) {
            userSession.messages = [];
        }
        userSession.messages.push(message);

        await handleUserMessage(socket, message);
    });

    socket.on("disconnect", () => {
        console.log("⚠️ User disconnected:", socket.id);
    });
});

// ✅ Handle refresh and session resets
app.use((req, res, next) => {
    if (req.originalUrl === "/chat") {
        console.log("Current Session ID:", req.sessionID);

        if (!req.session.previousSessionId) {
            req.session.previousSessionId = req.sessionID;
        } else if (req.session.previousSessionId !== req.sessionID) {
            console.log("Page refreshed! Resetting session...");

            req.session.destroy(err => {
                if (err) {
                    console.error("Error destroying session:", err);
                    return next();
                }
                req.session = null;
                res.clearCookie("connect.sid");
                res.redirect("/chat");
            });

            return;
        }
    }

    next();
});

// ✅ Use chatbot routes
app.use("/api", chatRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
