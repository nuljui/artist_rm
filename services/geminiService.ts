import { GoogleGenAI } from "@google/genai";
import { Artist, Persona } from "../types";

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API Key not found. Please set VITE_GEMINI_API_KEY in your .env file or Vercel project settings.");
  return new GoogleGenAI({ apiKey });
};

export const GeminiService = {

  /**
   * Analyzes the artist roster to generate high-level insights.
   */
  generateInsights: async (artists: Artist[]): Promise<string> => {
    try {
      const ai = getAI();

      // We convert the data to a simplified string to save tokens
      const dataSummary = artists.map(a =>
        `Name: ${a.name}, ArtType: ${a.artType}, Persona: ${a.persona}, Fit: ${a.fitScore}/5, Status: ${a.status}, Notes: ${a.notes}, Influence: ${a.influenceScore}`
      ).join('\n');

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `You are an Artist Relations Manager for a creative software company. Analyze the following roster of artists and provide 3 brief, actionable strategic insights.
        Focus on:
        1. Moving artists down the funnel (from Discovered -> Advocate).
        2. Identifying high-value targets (High Fit/Influence).
        3. Gaps in our outreach strategy.
        
        Data:
        ${dataSummary}`,
      });

      return response.text || "Could not generate insights.";
    } catch (error) {
      console.error("Gemini Insight Error:", error);
      return "Unable to generate insights at this time. Please ensure your API Key is valid.";
    }
  },

  /**
   * Drafts a follow-up message (DM or Email) based on artist data and user context.
   */
  draftMessage: async (artist: Artist, context?: { engagementType?: string, template?: string, history?: any[] }): Promise<string> => {
    try {
      const ai = getAI();
      const primaryProfile = artist.profiles[0] || { platform: 'Email', url: '' };

      const historyText = context?.history && context.history.length > 0
        ? context.history.map(h => `[${h.sentAt}] ${h.type}: ${h.messageText}`).join('\n')
        : "No prior history.";

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `You are the owner of a creative software company writing a personal, direct message to an artist.
        
        Target Artist: ${artist.name}
        Platform: ${primaryProfile.platform} (${primaryProfile.url || 'No URL'})
        
        CRM Context:
        - Art Type: ${artist.artType}
        - Persona: ${artist.persona} (Adjust tone: ${artist.persona === Persona.INFLUENCER ? 'Hype/Casual' : 'Professional/Respectful'})
        - Pipeline Status: ${artist.status}
        - Fit Score: ${artist.fitScore}/5
        - Owner Notes: ${artist.notes}
        
        Engagement Context:
        - Type: ${context?.engagementType || 'Initial Message'}
        - Template Goal: ${context?.template || 'General Outreach'}
        
        Message History (Chronological):
        ${historyText}
        
        Instructions:
        1. Write a SHORT, personalized message strings (under 280 chars if Twitter/Instagram).
        2. If a URL is provided, mention specific details about their work that might be found there (simulate viewing their portfolio).
        3. If "Message History" exists, refer back to previous points naturally.
        4. Tone should be "Founder to Artist" - authentic, not marketing fluff.
        5. No subject lines.`,
      });
      return response.text || "";
    } catch (error) {
      console.error("Gemini Message Error:", error);
      return "Error generating message draft. Please check your API key.";
    }
  },

  /**
   * Smart Search / Query on Data
   */
  askData: async (query: string, artists: Artist[]): Promise<string> => {
    try {
      const ai = getAI();
      // Simplify payload
      const dataContext = JSON.stringify(artists.map(a => ({
        name: a.name,
        type: a.artType,
        persona: a.persona,
        fit: a.fitScore,
        status: a.status,
        influence: a.influenceScore
      })));

      const response = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: `You are a data assistant for an Artist Relations team. Answer the user's question based strictly on this JSON dataset: ${dataContext}.
        
        User Question: ${query}
        
        Keep the answer extremely brief and data-driven.`,
      });

      return response.text || "I couldn't find an answer in the data.";
    } catch (error) {
      return "Error processing query.";
    }
  }
};