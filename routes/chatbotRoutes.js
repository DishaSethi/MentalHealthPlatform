const express = require("express");
// const fs = require('fs');
const router = express.Router();
const multer = require("multer");
const fs = require("fs");
const upload = multer({ storage: multer.memoryStorage() }); // Store in memory instead of disk

// const router = express.Router();

const path = require("path");
const { handleUserMessage,getMentalHealthScore, generateReport, handleUploadedText } = require("../controllers/chatbotController");
// const upload = require("../middlewares/fileupload");


// Middleware to reset session history only when /chat is refreshed
// Middleware to reset session history only on /chat refresh


router.post("/chat", async (req, res) => {
  // console.log("Chat API hit!");
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  try {

    const previousAnalysis = req.session.mentalHealthAnalysis || null;

    console.log("Previous Analysis in Chat:", previousAnalysis);
    // Simulating a socket object with an "emit" function to handle the response
  
    const analysisResult = await getMentalHealthScore(modifiedMessage);

    console.log("Analysis Result:", analysisResult);
    const fakeSocket = {
      emit: (event, aiResponse) => {
        if (!res.headersSent) {
          res.json({ event, aiResponse });

          
          // console.log("Updated Analysis History:", req.session.analysisHistory);
        }
      },
    };
    // Modify message context to include previous analysis
    let modifiedMessage = message;
    if (previousAnalysis) {
      modifiedMessage = `User has a mental health score of ${previousAnalysis.score} and sentiment: ${previousAnalysis.sentiment}. Here is their new message: ${message}`;
    }


    // Call handleUserMessage with a fake socket
    await handleUserMessage(fakeSocket, modifiedMessage);
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ error: "Failed to get AI response" });
  }
});


router.get("/report/:sessionId", async (req, res) => {
  try {
      const sessionId = req.params.sessionId;
      const summary = await generateReport(sessionId);
      console.log(summary);
      res.json({ report: summary });
  } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ error: "Failed to generate report" });
  }
});


// router.post("/uploadReport", upload.single("file"), async (req, res) => {
//   if (!req.file) {
//       return res.status(400).json({ error: "No file uploaded" });
//   }

//   try {
//     // const fakeSocket = {
//     //   emit: (event, data) => res.json({ event, aiResponse: data }), // Send response as API JSON
//     // };
//       const filePath = path.join(__dirname, "..", req.file.path);
//       const fileContents = fs.readFileSync(filePath, "utf-8");

//       console.log("Received Report:", fileContents);

//       const analysisResult = await getMentalHealthScore(fileContents);



//     // Ensuring response is sent only once
//     let responseSent = false;

//     const fakeSocket = {
//       emit: (event, data) => {
//         if (!res.headersSent) {  
//           return res.json({ event, aiResponse: data });
//         }
//       },
//     };
    

//       // Generate a therapy response based on the report
//       const aiResponse = await handleUploadedText(fakeSocket,fileContents);

//       // Send AI-generated response back
//       // res.json({ message: "Report processed successfully", response: aiResponse });
//       // res.json({
//       //   message: "Report processed successfully",
//       //   analysis: analysisResult,
//       // });
//       // Remove file to free up space
//       req.session.mentalHealthAnalysis = {
//         score: analysisResult.mental_health_score,
//         sentiment: analysisResult.ai_sentiment,
//         timestamp: new Date(),
//       };

//       console.log("Stored in session:", req.session.mentalHealthAnalysis);

//  // ✅ Store history of reports in session
//  if (!req.session.analysisHistory) {
//   req.session.analysisHistory = []; // Initialize if not present
// }

// req.session.analysisHistory.push({
//   score: analysisResult.mental_health_score,
//   sentiment: analysisResult.ai_sentiment,
//   timestamp: new Date(),
// });
// req.session.save((err) => {
//   if (err) {
//     console.error("Session save error:", err);
//   } else {
//     console.log("Session saved successfully!");
//   }
// });

// console.log("Stored Analysis History:", req.session.analysisHistory); 

//       fs.unlinkSync(filePath);
//   } catch (error) {
//       console.error("Error processing file:", error);
//       res.status(500).json({ error: "Error processing file" });
//   }
// });

// router.post("/uploadReports", upload.single("file"), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ error: "No file uploaded" });
//   }

//   try {
//     const filePath = path.join(__dirname, "..", req.file.path);
//     const fileContents = fs.readFileSync(filePath, "utf-8");

//     console.log("Received Report:", fileContents);

//     // Get Mental Health Score
//     const analysisResult = await getMentalHealthScore(fileContents);

//     // Generate AI Response
//     // const aiResponse = await handleUploadedText(fileContents); // No need for fakeSocket

//     // Send final response only once
//     res.json({
//       message: "Report processed successfully",
//       analysis: analysisResult,
     
//     });

//     // Remove file to free up space
//     fs.unlinkSync(filePath);
//   } catch (error) {
//     console.error("Error processing file:", error);
//     res.status(500).json({ error: "Error processing file" });
//   }
// });


router.post("/uploadReport", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    // Convert file buffer to text (for plain text files)
    const fileContents = req.file.buffer.toString("utf-8");

    console.log("Received Report:", fileContents);

    // Process the mental health analysis
    const analysisResult = await getMentalHealthScore(fileContents);

    // Store file content in session
    req.session.uploadedReport = {
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
      content: fileContents, // Store file contents as a string
      timestamp: new Date(),
    };

    console.log("Stored in session:", req.session.uploadedReport);

    // ✅ Store analysis history in session
    if (!req.session.analysisHistory) {
      req.session.analysisHistory = []; // Initialize if not present
    }
    const fakeSocket = {
            emit: (event, data) => {
              if (!res.headersSent) {  
                return res.json({ event, aiResponse: data });
              }
            },
          };

      const aiResponse = await handleUploadedText(fakeSocket,fileContents);

    req.session.analysisHistory.push({
      score: analysisResult.mental_health_score,
      sentiment: analysisResult.ai_sentiment,
      timestamp: new Date(),
    });

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
      } else {
        console.log("Session saved successfully!");
      }
    });

    console.log("Stored Analysis History:", req.session.analysisHistory);

    // Send final response
    // console.log("Stored Analysis History:", req.session.analysisHistory); 
    // res.json({
    //   message: "Report processed successfully",
    //   analysis: analysisResult,
    //   reportStoredInSession: true,
    // });

  } catch (error) {
    console.error("Error processing file:", error);
    res.status(500).json({ error: "Error processing file" });
  }
});



router.get("/analysisHistory", (req, res) => {
  try {
    if (!req.session) {
      return res.status(500).json({ error: "Session not initialized" });
    }

    // Get analysis history, return an empty array if undefined
    const analysisHistory = req.session.analysisHistory || [];

    console.log("Returning Analysis History:", analysisHistory);

    res.json({ history: analysisHistory }); // Always return JSON
  } catch (error) {
    console.error("Error fetching analysis history:", error);
    res.status(500).json({ error: "Failed to fetch analysis history" });
  }
});
router.post("/clearSession", (req, res) => {
  req.session.destroy((err) => {
      if (err) {
          console.error("Error destroying session:", err);
          return res.status(500).json({ message: "Failed to clear session" });
      }
      res.clearCookie("connect.sid"); // Clear session cookie
      res.json({ message: "Session cleared successfully" });
  });
});



module.exports = router;
