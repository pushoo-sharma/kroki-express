// app.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Directory to store the generated images
const imageDirectory = path.join(__dirname, 'images');

// Ensure the directory exists
if (!fs.existsSync(imageDirectory)) {
  fs.mkdirSync(imageDirectory);
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Function to delete files older than 3 days
const deleteOldImages = () => {
  const now = Date.now();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

  // Read all files in the directory
  fs.readdir(imageDirectory, (err, files) => {
    if (err) {
      console.error('Error reading image directory', err);
      return;
    }

    files.forEach(file => {
      const filePath = path.join(imageDirectory, file);

      // Get the file's stats, including creation time
      fs.stat(filePath, (err, stats) => {
        if (err) {
          console.error('Error getting file stats', err);
          return;
        }

        const fileAgeInMs = now - new Date(stats.mtime).getTime();

        // If the file is older than 3 days, delete it
        if (fileAgeInMs > threeDaysInMs) {
          fs.unlink(filePath, (err) => {
            if (err) {
              console.error('Error deleting file', filePath, err);
            } else {
              console.log(`Deleted old file: ${filePath}`);
            }
          });
        }
      });
    });
  });
};

// POST endpoint to generate the diagram and save it as an SVG file
app.post('/generate', async (req, res) => {
  const { diagram } = req.body;

  if (!diagram) {
    return res.status(400).send('No diagram data provided');
  }

  try {
    const payload = {
      diagram_source: diagram
    };

    // Request the diagram from Kroki in SVG format
    const response = await axios.post('https://kroki.io/mermaid/svg', payload);

    // Generate a unique filename for the SVG file
    const filename = `${uuidv4()}.svg`;
    const filePath = path.join(imageDirectory, filename);

    // Save the SVG file to the server
    fs.writeFileSync(filePath, response.data);

    // Construct a URL to access the stored image
    const imageUrl = `${req.protocol}://${req.get('host')}/images/${filename}`;

    // delete older images
    deleteOldImages()
    
    // Send back the URL
    res.json({ url: imageUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send('Error generating diagram');
  }
});

// Serve static files from the 'images' directory
app.use('/images', express.static(imageDirectory));

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
