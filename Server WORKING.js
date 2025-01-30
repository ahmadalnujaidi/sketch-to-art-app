// server.js

const express = require('express');
const fs = require('fs');
const path = require('path');

const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = 3000;


// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Serve static files from the "public" directory
app.use(express.static('public'));

// Parse JSON bodies for POST requests
app.use(express.json({ limit: '10mb' })); // Increase limit if needed

// Route for the landing page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route for the sketch page
app.get('/sketch', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'sketch.html'));
});

// Route for the results page
app.get('/results', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

// Route to handle saving the canvas image
app.post('/save-image', (req, res) => {
    const imageData = req.body.image;
    const base64Data = imageData.replace(/^data:image\/png;base64,/, '');
    const imagePath = path.join(uploadsDir, `sketch-${Date.now()}.png`);

    fs.writeFile(imagePath, base64Data, 'base64', (err) => {
        if (err) {
            console.error(err);
            res.json({ success: false });
        } else {
            res.json({ success: true, path: imagePath });
        }
    });
});


app.post('/generate_description', (req, res) => {
    const imageDate = req.body.image;

    generateDescription(imageDate);
    res.sendFile(path.join(__dirname, 'public', 'results.html'));

});



// With this:
const { OpenAI } = require('openai');
const { log } = require('console');
// import OpenAI from "openai";
const openai = new OpenAI();

async function generateDescription(img){
    // const response = await openai.chat.completions.create({
    //     model: "gpt-4o-mini",
    //     messages: [
    //       {
    //         role: "user",
    //         content: [
    //           { type: "text", text: "whats in this image? only say the items. absolutely nothing else." },
    //           {
    //             type: "image_url",
    //             image_url: {
    //               "url": img,
    //             },
    //           },
    //         ],
    //       },
    //     ],
    //     store: true,
    //   });
      
    //   console.log(response.choices[0].message.content);
      console.log('Calling generate image');
      generateImage("test");

    //   generateImage(response.choices[0].message.content);
}

const generateImage = async (description) => {
    console.log('Generating image');
    // const response = await openai.images.generate({
    //     model: "dall-e-3",
    //     prompt: `${description}`,
    //      STYLE 
    //     n: 1,
    //     size: "1024x1024",
    // });
    // console.log(response);
    };

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
