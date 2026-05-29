// OpenRouter API Service (OpenAI-compatible)
const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
const openrouterBaseUrl = 'https://openrouter.ai/api/v1';

// Using Claude 3 Haiku via OpenRouter (fast and efficient for education)
const model = 'anthropic/claude-3-haiku';

if (!apiKey) {
  console.warn('OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in .env.local');
}

export const aiService = {
  // Chat functionality
  async chat(message: string, context?: string) {
    try {
      if (!apiKey) {
        return {
          success: false,
          message: 'OpenRouter API key not configured. Please set VITE_OPENROUTER_API_KEY in .env.local',
        };
      }

      const systemPrompt = `You are an educational AI assistant for Sri Bhashyam Public School Management System.
You help students with their academic queries, assignments, and general school-related questions.
Be friendly, encouraging, and provide clear explanations suitable for high school students.
${context ? `Additional context: ${context}` : ''}`;

      const response = await fetch(`${openrouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Sri Bhashyam School Management',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: message,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
        console.error('OpenRouter API Error:', errorMessage);
        return {
          success: false,
          message: `Error: ${errorMessage}`,
        };
      }

      const data = await response.json();
      const aiMessage = data.choices?.[0]?.message?.content || 'No response received from AI';

      return {
        success: true,
        message: aiMessage,
      };
    } catch (error) {
      console.error('Chat Service Error:', error);
      return {
        success: false,
        message: `Error: ${error instanceof Error ? error.message : 'Failed to connect to AI service'}`,
      };
    }
  },

  // Generate study guide
  async generateStudyGuide(subject: string, topic: string) {
    try {
      if (!apiKey) {
        return {
          success: false,
          content: 'OpenRouter API key not configured',
        };
      }

      const prompt = `Create a comprehensive study guide for a high school student on:
Subject: ${subject}
Topic: ${topic}

Format the guide with:
1. **Key Concepts & Definitions** - Essential terms and their meanings
2. **Important Points** - Main ideas to remember
3. **Examples & Applications** - Real-world examples showing how this topic applies
4. **Practice Questions** - 3-5 practice questions with answers
5. **Quick Summary** - A brief recap of the most important points

Make it clear, engaging, and easy to understand for high school students.`;

      const response = await fetch(`${openrouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Sri Bhashyam School Management',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational tutor creating detailed study guides for high school students. Provide comprehensive, well-organized, and easy-to-understand content.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 1000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
        console.error('OpenRouter API Error:', errorMessage);
        return {
          success: false,
          content: `Error: ${errorMessage}`,
        };
      }

      const data = await response.json();
      const guide = data.choices?.[0]?.message?.content || 'No study guide generated';

      return {
        success: true,
        content: guide,
      };
    } catch (error) {
      console.error('Study Guide Error:', error);
      return {
        success: false,
        content: `Error: ${error instanceof Error ? error.message : 'Failed to generate study guide'}`,
      };
    }
  },

  // Explain concept
  async explainConcept(concept: string) {
    try {
      if (!apiKey) {
        return {
          success: false,
          explanation: 'OpenRouter API key not configured',
        };
      }

      const prompt = `Explain the concept of "${concept}" in simple, easy-to-understand language suitable for a high school student.

Include:
1. **Simple Definition** - What is this concept in plain English?
2. **Why It Matters** - Why should students care about this concept?
3. **Real-World Examples** - Concrete examples showing how this applies in real life
4. **Common Misconceptions** - Myths or wrong ideas students often have about this concept and why they're wrong
5. **Key Takeaway** - One sentence summary of the most important thing to remember

Keep the explanation clear, concise, and engaging.`;

      const response = await fetch(`${openrouterBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Sri Bhashyam School Management',
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: 'You are a friendly and excellent educational explainer. Explain concepts in simple, clear language that high school students can easily understand. Use analogies and real-world examples when helpful.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || `API Error: ${response.status}`;
        console.error('OpenRouter API Error:', errorMessage);
        return {
          success: false,
          explanation: `Error: ${errorMessage}`,
        };
      }

      const data = await response.json();
      const explanation = data.choices?.[0]?.message?.content || 'No explanation generated';

      return {
        success: true,
        explanation: explanation,
      };
    } catch (error) {
      console.error('Explain Concept Error:', error);
      return {
        success: false,
        explanation: `Error: ${error instanceof Error ? error.message : 'Failed to explain concept'}`,
      };
    }
  },
};
