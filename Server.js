// server.js

const express = require("express");
const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");
dotenv.config();

const { OpenAI } = require("openai");
const { log } = require("console");
const openai = new OpenAI();

const app = express();
const port = 3000;

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve static files from the "public" directory
app.use(express.static("Public"));

// Parse JSON bodies for POST requests
app.use(
  express.json({
    limit: "100mb",
    extended: true,
  })
); // Increase limit if needed

app.use(
  express.urlencoded({
    limit: "100mb",
    extended: true,
  })
);

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

let imageStore = []; // Store images for different requests

// Handle image generation request
app.post("/generate_description", async (req, res) => {
  try {
    const imageUrl = req.body.image;
    const deviceInfo = req.body.deviceInfo;

    console.log(`Processing request from device: ${deviceInfo?.userAgent}`);

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "No image data provided",
      });
    }

    // Validate image data
    if (!imageUrl.startsWith("data:image/")) {
      return res.status(400).json({
        success: false,
        error: "Invalid image format",
      });
    }

    // Process image with increased timeout for mobile devices
    const timeoutDuration = deviceInfo?.isMobile ? 40000 : 25000;

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("OpenAI request timeout")),
        timeoutDuration
      );
    });

    const responsePromise = openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
              what's in this image?
              Only say what's in the image and where they are. Absolutely nothing else. for example: "A cat on a table", "A person in a park".
              Any stick figures should be described as "a person".
              Dont use any symbols, only commas and periods if necessary.
              `,
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

    const response = await Promise.race([responsePromise, timeoutPromise]);

    // Log success for debugging
    console.log(`Successfully processed image from ${deviceInfo?.userAgent}`);

    // the text itself is in response.choices[0].message.content[0].text
    console.log(response.choices[0].message.content);

    const storedImageDataUrl = await generateImage(
      response.choices[0].message.content
    );

    // Store the generated image URL
    imageStore.push(storedImageDataUrl);

    // console.log(imageStore);
    res.json({ success: true });
  } catch (error) {
    console.error("Error processing request:", {
      error: error.message,
      stack: error.stack,
      deviceInfo: req.body.deviceInfo,
    });
    res.status(500).json({
      success: false,
      error: "Failed to process image",
      message: error.message,
    });
  }
});

// Polling endpoint to check if the image is ready
app.get("/get_generated_image/", (req, res) => {
  if (imageStore.length > 0) {
    const latestImage = imageStore[imageStore.length - 1];
    imageStore = []; // Clear the store after sending the latest image
    res.json({ success: true, imageUrl: latestImage });
  } else {
    res.json({ success: false, message: "No image available" });
  }
});

const generateImage = async (description) => {
  console.log("Generating image...");

  const generatedImage = await openai.images.generate({
    model: "dall-e-3",
    prompt: `${description}`,
    style: "natural",
    // n: 1,
  });

  console.log(generatedImage.data);
  // console.log(generatedImage.data[0].url);

  return generatedImage.data[0].url;
};

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    message: err.message,
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
