const express = require("express");
// const fs = require('fs');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const upload = multer({ dest: "uploads/" });
const path = require("path");
const { handleUserMessage, generateSummary, handleUploadedText } = require("../controllers/chatbotController");
// const upload = require("../middlewares/fileupload");

router.post("/chat", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {
    // Simulating a socket object with an "emit" function to handle the response
    const fakeSocket = {
      emit: (event, data) => res.json({ event, aiResponse: data }), // Send response as API JSON
    };

    // Call handleUserMessage with a fake socket
    await handleUserMessage(fakeSocket, message);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});


router.get("/report/:sessionId", async (req, res) => {
  try {
      const sessionId = req.params.sessionId;
      const summary = await generateSummary(sessionId);
      console.log(summary);
      res.json({ report: summary });
  } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
  }
});


router.post("/uploadReport", upload.single("file"), async (req, res) => {
  if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // const fakeSocket = {
    //   emit: (event, data) => res.json({ event, aiResponse: data }), // Send response as API JSON
    // };
      const filePath = path.join(__dirname, "..", req.file.path);
      const fileContents = fs.readFileSync(filePath, "utf-8");

      console.log("Received Report:", fileContents);



    // Ensuring response is sent only once
    let responseSent = false;

    const fakeSocket = {
      emit: (event, data) => {
        if (!res.headersSent) {  
          return res.json({ event, aiResponse: data });
        }
      },
    };
    

      // Generate a therapy response based on the report
      const aiResponse = await handleUploadedText(fakeSocket,fileContents);

      // Send AI-generated response back
      // res.json({ message: "Report processed successfully", response: aiResponse });

      // Remove file to free up space
      fs.unlinkSync(filePath);
  } catch (error) {
      console.error("Error processing file:", error);
      res.status(500).json({ error: "Error processing file" });
  }
});

module.exports = router;
