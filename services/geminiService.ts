import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables");
  }
  return new GoogleGenAI({ apiKey });
};

export const summarizeDocument = async (text: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Please provide a concise summary of the following document:\n\n${text.slice(0, 10000)}...`, // Truncate to avoid token limits on very large docs
      config: {
        systemInstruction: "You are a helpful assistant that summarizes documents efficiently.",
      }
    });
    return response.text || "No summary generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate summary. Please check your API key.";
  }
};

export const askAboutDocument = async (text: string, question: string): Promise<string> => {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Document Content:\n${text.slice(0, 20000)}\n\nQuestion: ${question}`,
      config: {
        systemInstruction: "You are an intelligent research assistant. Answer the user's question based strictly on the provided document content.",
      }
    });
    return response.text || "No answer generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to get answer. Please check your API key.";
  }
};