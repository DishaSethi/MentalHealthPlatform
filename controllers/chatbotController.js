// const axios = require("axios");

// const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// // Temporary in-memory message storage
// const activeMessages = new Map();

// // Function to handle user messages
// async function handleUserMessage(socket, message) {
//   console.log("User:", message);

//   // Get AI response
//   const aiResponse = await getAIResponse(message);

//   // ✅ Debug: Log AI response before sending
//   console.log("🚀 Sending AI response to client:", aiResponse);

//   socket.emit("aiMessage", aiResponse); 

//   // Store message temporarily
//   const messageId = Date.now(); // Unique ID
//   activeMessages.set(messageId, { userMessage: message, aiResponse });

//   // Auto-delete message after 10 minutes
//   setTimeout(() => {
//     activeMessages.delete(messageId);
//     console.log("Message deleted:", messageId);
//   }, 10 * 60 * 1000); // 10 minutes
// }

// // Function to call Gemini AI API
// async function getAIResponse(userMessage) {
//   try {
//     // 🛠 Ensure userMessage is a string
//     const messageText = typeof userMessage === "string" ? userMessage : JSON.stringify(userMessage);
//     if (messageText.match(/(suicide|self-harm|depressed|hurt myself|ending my life)/i)) {
//       return {
//         response: "I'm really sorry you're feeling this way. You're not alone. 💙 Please consider reaching out to a trusted friend, family member, or a professional. If you need immediate help, here are some crisis resources: [Crisis Text Line](https://www.crisistextline.org/) 📞"
//       };
//     }
//     const requestBody = {
//       contents: [
//         {
//           role: "user",
//           parts: [{ text: messageText }]
//         }
//       ]
//     };

//     console.log("🚀 Sending request to Gemini API:", JSON.stringify(requestBody, null, 2));

//     const response = await axios.post(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
//       requestBody,
//       {
//         headers: { "Content-Type": "application/json" }
//       }
//     );

//     console.log("✅ Gemini API response:", JSON.stringify(response.data, null, 2));

//     if (
//       response.data &&
//       response.data.candidates &&
//       response.data.candidates.length > 0 &&
//       response.data.candidates[0].content &&
//       response.data.candidates[0].content.parts &&
//       response.data.candidates[0].content.parts.length > 0
//     ) {
//       return response.data.candidates[0].content.parts[0].text;
//     } else {
//       throw new Error("Invalid response structure from Gemini API");
//     }
//   } catch (error) {
//     console.error("❌ Error calling Gemini API:", JSON.stringify(error.response?.data || error, null, 2));
//     return { response: "I'm here to listen. You're not alone. Let's talk. 💙" };
//   }
// }


// // Function to generate a summary of conversation
// async function generateSummary(sessionId) {
//   try {
//     // Retrieve all user messages from activeMessages Map
//     const sessionMessages = [...activeMessages.values()]
//       .map(msg => `User: ${msg.userMessage}\nAI: ${msg.aiResponse}`)
//       .join("\n");

//     if (!sessionMessages) return "No conversation history available.";

//     // Call AI to summarize the conversation
    
//     const summaryResponse = await getAIResponse(
//       `Summarize this conversation:\n${sessionMessages}`
//     );

//     return summaryResponse;
//   } catch (error) {
//     console.error("Error generating summary:", error);
//     return "Sorry, an error occurred while generating the summary.";
//   }
// }

// module.exports = { handleUserMessage, getAIResponse, generateSummary };

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Temporary in-memory message storage
const activeMessages = new Map();

/**
 * Handles user messages and fetches AI response.
 */
async function handleUserMessage(socket, message) {
  console.log("User:", message);

  // Get AI response
  const aiResponse = await getAIResponse(message);

  console.log("🚀 Sending AI response to client:", aiResponse);
  socket.emit("aiMessage", aiResponse);

  // Store message temporarily
  const messageId = Date.now(); 
  activeMessages.set(messageId, { userMessage: message, aiResponse });

  // Auto-delete message after 10 minutes
  setTimeout(() => {
    activeMessages.delete(messageId);
    console.log("Message deleted:", messageId);
  }, 10 * 60 * 1000);
}

/**
 * Calls Gemini AI API to generate a response.
 */
async function getAIResponse(userMessage, fileContent = "") {
  try {
    const messageText = typeof userMessage === "string" ? userMessage : JSON.stringify(userMessage);

    // Suicide prevention check
    if (messageText.match(/(suicide|self-harm|depressed|hurt myself|ending my life)/i)) {
      return {
        response: "I'm really sorry you're feeling this way. You're not alone. 💙 Please consider reaching out to a trusted friend, family member, or a professional. If you need immediate help, here are some crisis resources: [Crisis Text Line](https://www.crisistextline.org/) 📞"
      };
    }

    const systemPrompt = `
    You are an empathetic mental wellness assistant. Your goal is to provide comfort, emotional validation, and gentle guidance to users who may be feeling stressed, anxious, or overwhelmed. 
    - Speak in a warm, understanding, and uplifting manner.
    - Acknowledge the user's feelings and offer supportive insights.
    - Suggest mindfulness exercises, journaling, breathing techniques, or reaching out to loved ones.
    - Avoid sounding clinical or dismissive; instead, be engaging and human.
    - If the user expresses deep distress, recommend professional help or crisis resources.
    - Keep responses conversational, with short and encouraging sentences.
    `;

    // Combine file content with user message if available
    const finalPrompt = fileContent
      ? `Here is some reference text:\n"${fileContent}"\n\nUser: ${messageText}`
      : `${systemPrompt}\n\nUser: ${messageText}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [{ text: finalPrompt }]
        }
      ]
    };

    console.log("🚀 Sending request to Gemini API:", JSON.stringify(requestBody, null, 2));

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`,
      requestBody,
      { headers: { "Content-Type": "application/json" } }
    );

    console.log("✅ Gemini API response:", JSON.stringify(response.data, null, 2));

    if (
      response.data &&
      response.data.candidates &&
      response.data.candidates.length > 0 &&
      response.data.candidates[0].content &&
      response.data.candidates[0].content.parts &&
      response.data.candidates[0].content.parts.length > 0
    ) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Invalid response structure from Gemini API");
    }
  } catch (error) {
    console.error("❌ Error calling Gemini API:", JSON.stringify(error.response?.data || error, null, 2));
    return { response: "I'm here to listen. You're not alone. Let's talk. 💙" };
  }
}

/**
 * Handles file upload, reads the file, and fetches an AI response based on its content.
 */
async function handleUploadedText(socket, fileContents) {
  // try {
  //   if (!fs.existsSync(filePath)) {
  //     return socket.emit("error", "File not found.");
  //   }

  //   const fileContent = fs.readFileSync(filePath, "utf8");
try{
    console.log("📄 Read file content:", fileContents.substring(0, 100) + "..."); // Log first 100 chars

    const aiResponse = await getAIResponse("Summarize this text:", fileContents);

    console.log("🚀 AI Summary:", aiResponse);
    socket.emit("aiMessage", aiResponse);
  } catch (error) {
    console.error("❌ Error reading file:", error);
    socket.emit("error", "Failed to process the uploaded file.");
  }
}

/**
 * Generates a summary of the conversation.
 */
async function generateSummary(sessionId) {
  try {
    // Retrieve all user messages from activeMessages Map
    const sessionMessages = [...activeMessages.values()]
      .map(msg => `User: ${msg.userMessage}\nAI: ${msg.aiResponse}`)
      .join("\n");

    if (!sessionMessages) return "No conversation history available.";

    // Call AI to summarize the conversation
    
    const summaryResponse = await getAIResponse(
      `Summarize this conversation:\n${sessionMessages}`
    );
    console.log("✅ Summary Response:", summaryResponse);

    return summaryResponse;
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Sorry, an error occurred while generating the summary.";
  }
}

module.exports = { handleUserMessage, getAIResponse, handleUploadedText, generateSummary };
