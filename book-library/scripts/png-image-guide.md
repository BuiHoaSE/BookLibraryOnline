# Using PNG Book Cover Images

This guide will help you add the actual book cover PNG images to your application.

## Required PNG Files

You need to save the following PNG files in the `/public/images/covers/` directory:

1. `to-kill-a-mockingbird.png` - The cover for "To Kill a Mockingbird" by Harper Lee
2. `1984.png` - The cover for "1984" by George Orwell
3. `the-great-gatsby.png` - The cover for "The Great Gatsby" by F. Scott Fitzgerald
4. `pride-and-prejudice.png` - The cover for "Pride and Prejudice" by Jane Austen
5. `the-catcher-in-the-rye.png` - The cover for "The Catcher in the Rye" by J.D. Salinger

## Image Recommendations

For best results:

- **Dimensions**: PNG images should be 200px wide by 300px tall (or maintain a 2:3 aspect ratio)
- **Format**: PNG with transparency for best quality
- **File size**: Keep files under 200KB for optimal loading performance
- **Resolution**: 72-150 DPI is sufficient for web display

## How to Add the Images

1. **Obtain book cover images**:
   - You can download them from online bookstores (ensure you have rights to use them)
   - Use the actual images you provided in your message
   - Create your own or use stock images

2. **Prepare the images**:
   - Resize them to 200x300px if needed
   - Name them exactly as listed above

3. **Save the images**:
   - Place them in the `/public/images/covers/` directory
   - Make sure the filenames match exactly what's expected in the code

## Fallback Behavior

If any PNG image is missing, the application will show a placeholder with the book title. For the best experience, ensure all PNG files are properly placed in the directory.

## Testing

After adding the PNG files, run your development server (`npm run dev`) and check that the book covers appear correctly on the page. 