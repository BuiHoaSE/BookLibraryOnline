# Adding Book Covers to Your Library

Follow these steps to add the book cover images to your library:

## Step 1: Prepare the Images

1. Save the following book cover images:
   - "To Kill a Mockingbird" by Harper Lee
   - "1984" by George Orwell
   - "The Great Gatsby" by F. Scott Fitzgerald
   - "Pride and Prejudice" by Jane Austen
   - "The Catcher in the Rye" by J.D. Salinger

2. Rename the files to match the expected filenames:
   - `to-kill-a-mockingbird.jpg`
   - `1984.jpg`
   - `the-great-gatsby.jpg`
   - `pride-and-prejudice.jpg`
   - `the-catcher-in-the-rye.jpg`

## Step 2: Add Images to Your Project

1. Make sure the directory structure exists:
   ```
   book-library/
   └── public/
       └── images/
           └── covers/
   ```

2. Place the renamed image files in the `book-library/public/images/covers/` directory.

## Step 3: Test the Images

1. Start your development server:
   ```
   npm run dev
   ```

2. Open your browser and navigate to your application.
3. The featured books section should now display the actual cover images.

## Troubleshooting

If the images don't appear:

1. Check that the image filenames match exactly what's expected
2. Verify the images are in the correct directory
3. Make sure the images are in an appropriate format (JPEG/JPG)
4. Check the browser console for any errors related to loading the images

The fallback system will display a placeholder with the book title if an image fails to load. 