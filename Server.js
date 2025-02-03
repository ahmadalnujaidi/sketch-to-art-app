// server.js

const express = require("express");
const fs = require("fs");
const path = require("path");

const dotenv = require("dotenv");

dotenv.config();

const { OpenAI } = require("openai");
const { log } = require("console");
// import OpenAI from "openai";
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

// Route to handle saving the canvas image
// app.post("/save-image", (req, res) => {
//   const imageData = req.body.image;
//   const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
//   const imagePath = path.join(uploadsDir, `sketch-${Date.now()}.png`);

//   fs.writeFile(imagePath, base64Data, "base64", (err) => {
//     if (err) {
//       console.error(err);
//       res.json({ success: false });
//     } else {
//       res.json({ success: true, path: imagePath });
//     }
//   });
// });

let imageStore = []; // Store images for different requests

// Handle image generation request
app.post("/generate_description", async (req, res) => {
  try {
    const imageUrl = req.body.image;
    // console.log(`Received image: ${imageUrl}`);

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

    // Store the generated image URL
    imageStore.push(storedImageDataUrl);

    console.log(imageStore);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Failed to process image" });
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
    prompt: `a painting of ${description}`,
    style: "natural",
    n: 1,
  });
  console.log(generatedImage.data);

  // Simulate a delay for the image generation
  // await new Promise((resolve) => setTimeout(resolve, 3000));

  // Simulated generated image URL
  // const generatedUrl = `https://dummyimage.com/1024x1024/000/fff.png&text=${description}`;

  // console.log(generatedImage.data[0].url);
  return generatedImage.data[0].url;
};

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
