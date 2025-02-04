// server.js

const express = require("express");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const session = require("express-session");

dotenv.config();

const app = express();
const port = 3000;

// Add session middleware
app.use(
  session({
    secret: "your-secret-key", // Change this to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: true }, // Set to true if using HTTPS
  })
);

const { OpenAI } = require("openai");
const { log } = require("console");
const openai = new OpenAI({
  apiKey:
    "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",
});

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve static files from the "public" directory
app.use(express.static("Public"));

// Parse JSON bodies for POST requests
app.use(express.json({ limit: "10mb" })); // Increase limit if needed

// Route for the landing page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "index.html"));
});

// Route for the sketch page
app.get("/sketch", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "sketch.html"));
});

// Route for the results page
app.get("/results", (req, res) => {
  res.sendFile(path.join(__dirname, "Public", "results.html"));
});

// Replace imageStore array with a sessions map
const imageStore = new Map();

// Handle image generation request
app.post("/generate_description", async (req, res) => {
  try {
    const imageUrl = req.body.image;
    const sessionId = req.session.id;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "whats in this image? only say the items. absolutely nothing else. dont use any symbols.",
            },
            {
              type: "image_url",
              image_url: {
                url: `${imageUrl}`,
              },
            },
          ],
        },
      ],
      store: true,
    });

    // the text itself is in response.choices[0].message.content[0].text
    console.log(response.choices[0].message.content);

    // Generate a unique ID for this request

    const storedImageDataUrl = await generateImage(
      response.choices[0].message.content
    );

    // Store the generated image URL with session ID
    imageStore.set(sessionId, storedImageDataUrl);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to process image" });
  }
});

// Update polling endpoint to use session ID
app.get("/get_generated_image/", (req, res) => {
  const sessionId = req.session.id;
  if (imageStore.has(sessionId)) {
    const image = imageStore.get(sessionId);
    imageStore.delete(sessionId); // Clear the image after sending
    res.json({ success: true, imageUrl: image });
  } else {
    res.json({ success: false, message: "No image available" });
  }
});

const generateImage = async (description) => {
  console.log("Generating image...");

  const generatedImage = await openai.images.generate({
    model: "dall-e-3",
    prompt: `a painting of ${description}`,
    style: "natural",
    n: 1,
  });

  // console.log(generatedImage.data);
  // console.log(generatedImage.data[0].url);
  return generatedImage.data[0].url;
};

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
