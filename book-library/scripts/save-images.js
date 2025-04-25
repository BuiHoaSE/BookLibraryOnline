const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

// URLs of the book covers (replace these with actual URLs if needed)
const bookCovers = [
  {
    name: 'to-kill-a-mockingbird.jpg',
    url: 'https://placeholder-for-to-kill-a-mockingbird.jpg'
  },
  {
    name: '1984.jpg',
    url: 'https://placeholder-for-1984.jpg'
  },
  {
    name: 'the-great-gatsby.jpg',
    url: 'https://placeholder-for-the-great-gatsby.jpg'
  },
  {
    name: 'pride-and-prejudice.jpg',
    url: 'https://placeholder-for-pride-and-prejudice.jpg'
  },
  {
    name: 'the-catcher-in-the-rye.jpg',
    url: 'https://placeholder-for-the-catcher-in-the-rye.jpg'
  }
];

// Function to download an image
const downloadImage = (url, imagePath) => {
  return new Promise((resolve, reject) => {
    // Determine if URL is http or https
    const client = url.startsWith('https') ? https : http;
    
    const request = client.get(url, (response) => {
      // Check if the response is successful
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image, status code: ${response.statusCode}`));
        return;
      }

      // Create write stream
      const file = fs.createWriteStream(imagePath);
      
      // Pipe the response to the file
      response.pipe(file);
      
      // Handle completion
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${imagePath}`);
        resolve();
      });
    });

    // Handle errors
    request.on('error', (err) => {
      fs.unlink(imagePath, () => {}); // Delete the file if there's an error
      reject(err);
    });
  });
};

// Main function to download all images
const downloadAllImages = async () => {
  const outputDir = path.join(__dirname, '../public/images/covers');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Download each image
  for (const cover of bookCovers) {
    const imagePath = path.join(outputDir, cover.name);
    try {
      await downloadImage(cover.url, imagePath);
    } catch (error) {
      console.error(`Error downloading ${cover.name}:`, error.message);
    }
  }

  console.log('All downloads completed');
};

// Run the script
downloadAllImages().catch(console.error); 