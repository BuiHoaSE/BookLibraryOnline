const fs = require('fs');
const path = require('path');

// Book covers with colors
const bookCovers = [
  {
    name: 'to-kill-a-mockingbird.svg',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    bgColor: '#f4f4d9', // Light cream color
    bgGradient: '#f4f4d9, #e4e4b9', // Gradient for cream color
    textColor: '#333333'
  },
  {
    name: '1984.svg',
    title: '1984',
    author: 'George Orwell',
    bgColor: '#e63946', // Bright red
    bgGradient: '#e63946, #9d2933', // Gradient for red
    textColor: '#ffffff'
  },
  {
    name: 'the-great-gatsby.svg',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    bgColor: '#1d3557', // Dark blue
    bgGradient: '#1d3557, #0a1c3a', // Gradient for dark blue
    textColor: '#f1faee'
  },
  {
    name: 'pride-and-prejudice.svg',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    bgColor: '#90e0ef', // Light blue
    bgGradient: '#90e0ef, #64c9e0', // Gradient for light blue
    textColor: '#03045e'
  },
  {
    name: 'the-catcher-in-the-rye.svg',
    title: 'The Catcher in the Rye',
    author: 'J.D. Salinger',
    bgColor: '#003049', // Navy blue
    bgGradient: '#003049, #001b2e', // Gradient for navy blue
    textColor: '#eae2b7'
  }
];

// Generate an SVG for a book cover
const generateSVG = (title, author, bgColor, bgGradient, textColor) => {
  // Break title into lines if it's too long
  const titleLines = [];
  let currentLine = '';
  const words = title.split(' ');
  
  for (const word of words) {
    if ((currentLine + ' ' + word).length <= 15) {
      currentLine = currentLine ? currentLine + ' ' + word : word;
    } else {
      titleLines.push(currentLine);
      currentLine = word;
    }
  }
  
  if (currentLine) {
    titleLines.push(currentLine);
  }
  
  // Get gradient colors
  const gradientColors = bgGradient ? bgGradient.split(', ') : [bgColor, bgColor];
  
  // Join the lines with SVG text elements
  const titleY = 140;
  const titleElements = titleLines.map((line, index) => 
    `<text x="100" y="${titleY + index * 30}" font-family="Arial" font-size="20" text-anchor="middle" font-weight="bold" fill="${textColor}" filter="url(#shadow)">${line}</text>`
  ).join('\n    ');

  return `<svg width="200" height="300" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="coverGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gradientColors[0]}" />
      <stop offset="100%" stop-color="${gradientColors[1]}" />
    </linearGradient>
    <filter id="shadow" x="-1" y="-1" width="300%" height="300%">
      <feDropShadow dx="0" dy="1" stdDeviation="1" flood-opacity="0.3" />
    </filter>
  </defs>
  <rect width="200" height="300" fill="url(#coverGradient)" rx="3" ry="3" />
  <rect x="10" y="10" width="180" height="280" fill="none" stroke="${textColor}" stroke-opacity="0.2" stroke-width="1" rx="2" ry="2" />
  ${titleElements}
  <text x="100" y="230" font-family="Arial" font-size="16" text-anchor="middle" fill="${textColor}" font-style="italic">${author}</text>
</svg>`;
};

// Main function to generate all SVGs
const generateAllPlaceholders = async () => {
  const outputDir = path.join(__dirname, '../public/images/covers');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Created directory: ${outputDir}`);
  }

  // Generate each SVG
  for (const cover of bookCovers) {
    const svgContent = generateSVG(cover.title, cover.author, cover.bgColor, cover.bgGradient, cover.textColor);
    const filePath = path.join(outputDir, cover.name);
    fs.writeFileSync(filePath, svgContent);
    console.log(`Generated: ${filePath}`);
  }

  console.log('All SVG placeholders generated');
};

// Run the script
generateAllPlaceholders().catch(console.error); 