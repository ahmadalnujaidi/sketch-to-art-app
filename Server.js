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


let imageStore = {}; // Store images for different requests

// Handle image generation request
app.post('/generate_description', async (req, res) => {
    try {
        const imageUrl = req.body.image;
        console.log(`Received image: ${imageUrl}`);

        // Generate a unique ID for this request
        const requestId = Date.now().toString();

        // Call function to process and generate a new image
        generateDescription(imageUrl, requestId);

        res.json({ success: true, requestId: requestId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: "Failed to process image" });
    }
});

// Polling endpoint to check if the image is ready
app.get('/get_generated_image/:requestId', (req, res) => {
    const requestId = req.params.requestId;
    
    if (imageStore[requestId]) {
        res.json({ success: true, imageUrl: imageStore[requestId] });
    } else {
        res.json({ success: false, message: "Image still processing" });
    }
});

async function generateDescription(img, requestId) {
    console.log('Calling generate image');
    const generatedUrl = await generateImage("test");

    // Store generated image for frontend polling
    imageStore[requestId] = generatedUrl;
}

const generateImage = async (description) => {
    console.log('Generating image...');

    // Simulate a delay for the image generation
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Simulated generated image URL
    const generatedUrl = `https://dummyimage.com/1024x1024/000/fff.png&text=${description}`;
    
    console.log(`Generated image: ${generatedUrl}`);
    return generatedUrl;
};


// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
