import { GoogleGenerativeAI } from '@google/generative-ai';

// Helper function to validate environment variables
export function validateEnv(): string {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
  }
  return apiKey;
}

// Initialize the Google AI client
export function getGeminiClient() {
  const apiKey = validateEnv();
  return new GoogleGenerativeAI(apiKey);
}

// Test the Gemini API access
export async function testGeminiAccess(): Promise<boolean> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    await model.generateContent("Test connection");
    console.log("Gemini API test successful");
    return true;
  } catch (error) {
    console.error("Gemini API test failed:", error);
    return false;
  }
}

// Extract book metadata from text
export async function extractBookMetadata(text: string): Promise<any> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

  const prompt = `
    Analyze this text from a book and extract the following metadata in JSON format. Pay SPECIAL ATTENTION to ISBN - it's critical to find it:
    {
      "title": "string",
      "author": "string",
      "genre": "string",
      "year": number,
      "isbn": "string (REQUIRED - look very carefully for ISBN)",
      "publisher": "string (look for publisher name, press, or publishing company)",
      "language": "string",
      "summary": "brief summary in 2-3 sentences"
    }
    
    For ISBN, look for ALL these patterns:
    1. ISBN-13: starts with 978 or 979, followed by 10 digits
    2. ISBN-10: 10 digits, may end with X
    3. Look for patterns like:
       - "ISBN: 0-123456789"
       - "ISBN-13: 978-0123456789"
       - "ISBN-10: 0123456789"
       - Standalone numbers matching ISBN format
    4. Check copyright pages and front matter carefully for ISBN
    5. Remove all hyphens and spaces from found ISBN
    
    If you can't determine other fields, use null, but try extremely hard to find the ISBN.
    Only respond with the JSON object, no other text.
    
    Text to analyze:
    ${text.slice(0, 3000)}  // Increased text length to catch more potential ISBN locations
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonStr = response.text();

    try {
      // Clean up the response to ensure it's valid JSON
      const cleanJson = jsonStr
        .replace(/```json\s*/, '') // Remove ```json prefix if present
        .replace(/```\s*$/, '') // Remove trailing ``` if present
        .trim();

      return JSON.parse(cleanJson);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", parseError);
      // Return a default structure with null values
      return {
        title: null,
        author: null,
        genre: null,
        year: null,
        isbn: null,
        publisher: null,
        language: null,
        summary: null
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw error;
  }
} 