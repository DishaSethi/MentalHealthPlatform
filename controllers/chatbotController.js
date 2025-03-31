
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
    // if (messageText.match(/(suicide|self-harm|depressed|hurt myself|ending my life)/i)) {
    //   return  "I'm really sorry you're feeling this way. You're not alone. 💙 Please consider reaching out to a trusted friend, family member, or a professional. If you need immediate help, here are some crisis resources: [Crisis Text Line](https://www.crisistextline.org/) 📞"
      
    // }

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
  `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`,
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
  // Analyze sentiment & detect topic
  const sentiment = await analyzeSentiment(fileContents);
  const topic = await detectTopic(fileContents);

  // Get AI-generated summary of the report
  const aiSummary = await getAIResponse(
    `Summarize this text briefly while maintaining a friendly and supportive tone:\n${fileContents}`
  );

  // Create a structured, doctor-style follow-up summary
  const formattedSummary = `
**🩺 Doctor's Follow-up Check-in**  
-------------------------------------  
**Hello! How have you been feeling lately?**  

📌 **Summary of Your Last Report:**  
${aiSummary}  

📊 **Sentiment Analysis:** ${sentiment}  

🎯 **Key Topics Discussed:** ${topic}  

💙 **Your Overall Mood Based on the Report:**  
${
  sentiment.includes("positive")
    ? "You seem to be in good spirits! 😊"
    : "There might be some concerns, but I appreciate you sharing. 💙"
}  

🔎 **How are you feeling now compared to what’s in this report?**  
- Have your stress levels, mood, or energy changed?  
- Were you able to apply any of the suggestions from last time?  
- Is there anything new that’s been on your mind?  

Feel free to share, I’m here to listen. 😊
    
  `;

    console.log("🚀 AI Summary:", formattedSummary);
    socket.emit("aiMessage", formattedSummary);
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
      
      console.log(sessionMessages);

    if (!sessionMessages) return "No conversation history available.";

    // Call AI to summarize the conversation
    const sentiment=await analyzeSentiment(sessionMessages);
    const topic =await detectTopic(sessionMessages);

    const summaryResponse = await getAIResponse(
      `Summarize this conversation:\n${sessionMessages}
       The sentiment of this conversation is: ${sentiment}. Provide a summary that is supportive,friendly, engaging, casual tone ,add fun touch and matches the mood.Also consider the ${topic}`
    );
    console.log("✅ Summary Response:", summaryResponse);

    return summaryResponse;
  } catch (error) {
    console.error("Error generating summary:", error);
    return "Sorry, an error occurred while generating the summary.";
  }
}

async function analyzeSentiment(text){
  const response= await getAIResponse(`Analyze the sentiment of this conversation: ${text}`);
  console.log(response+"is the sentiment");
  return response;
}

async function detectTopic(text){
  const response= await getAIResponse(`What is the main topic of this conversation? ${text}`);
  console.log(response+"is the topic");
return response;
}


async function generateReport(sessionId) {
  try {
    // Retrieve all user messages from activeMessages Map
    const sessionMessages = [...activeMessages.values()]
      .map(msg => `User: ${msg.userMessage}\nAI: ${msg.aiResponse}`)
      .join("\n");

    console.log(sessionMessages);

    if (!sessionMessages) return "No conversation history available.";

    // Analyze sentiment & detect topic
    const sentiment = await analyzeSentiment(sessionMessages);
    const topic = await detectTopic(sessionMessages);

    // Get conversation summary
    const summaryResponse = await getAIResponse(
      `Summarize this conversation:\n${sessionMessages}
       The sentiment of this conversation is: ${sentiment}. Provide a summary that is supportive, friendly, engaging, casual in tone, and adds a fun touch. Also, consider the topic: ${topic}`
    );

    console.log("✅ Summary Response:", summaryResponse);

    // Generate the final structured report
    const report = `
      **📝 Conversation Report**
      ---------------------------------
      **📌 Summary:**  
      ${summaryResponse}  

      **📊 Sentiment Analysis:**  
      ${sentiment}  

      **🎯 Main Topic:**  
      ${topic}  

      **💡 Actionable Insights:**  
      - Based on the conversation, consider practicing mindfulness or relaxation techniques.  
      - If this was a technical discussion, look into learning resources for ${topic}.  
      - Maintain a positive outlook and engage in activities that boost your mood! 🎉
    `;

    console.log("✅ Generated Report:", report);

    return report;
  } catch (error) {
    console.error("Error generating report:", error);
    return "Sorry, an error occurred while generating the report.";
  }
}

async function getMentalHealthScore(text){
  try{
    const response=await axios.post("https://mentalhealthplatform-python.onrender.com/analyze",{text});
    return response.data;
  }catch(error){
    console.error("Error getting mental health score:", error.message);
    return { error: "Could not analyze text" };
  }
}

// Update module exports to include generateReport
module.exports = { getMentalHealthScore,handleUserMessage, getAIResponse, handleUploadedText, generateReport,generateSummary };

// module.exports = { handleUserMessage, getAIResponse, handleUploadedText, generateSummary };
