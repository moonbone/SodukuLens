/**
 * Gemini service for Sudoku recognition.
 */
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function recognizeSudokuGrid(base64Image: string): Promise<number[][]> {
  // Extract MIME type and data
  const mimeTypeMatch = base64Image.match(/^data:(image\/[a-zA-Z]+);base64,/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
  const base64Data = base64Image.split(',')[1] || base64Image;

  const imagePart = {
    inlineData: {
      mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: "Extract the Sudoku puzzle grid from this image. Return a 9x9 grid where each inner array represents a row. Use 0 for empty cells and numbers 1-9 for filled cells.",
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [imagePart, textPart] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            grid: {
              type: Type.ARRAY,
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.NUMBER
                },
                description: "A row in the Sudoku grid (9 numbers)"
              },
              description: "A 9x9 Sudoku grid"
            }
          },
          required: ["grid"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const result = JSON.parse(text);
    const grid = result.grid;

    if (!Array.isArray(grid) || grid.length !== 9 || !grid.every(row => Array.isArray(row) && row.length === 9)) {
       console.error("Invalid grid format received:", grid);
       throw new Error("AI returned invalid grid format");
    }

    return grid;
  } catch (error) {
    console.error("Gemini OCR error:", error);
    throw error;
  }
}
