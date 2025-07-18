import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY;

export const openai = apiKey ? new OpenAI({ apiKey }) : null;

export function isConfigured(): boolean {
  return !!apiKey;
}

export async function generatePersonality(dimension: string, answers: string[]): Promise<Record<string, unknown> | null> {
  if (!openai) return null;

  const lines = answers.map((a, i) => `Q${i + 1}: ${a}`).join('\n');

  const prompt = `The user took the Corn Personality Test (dimension: ${dimension}). Based on their answers, generate a funny personality result. Return only JSON:

{
  "title": "short weird nickname with one emoji",
  "subtitle": "one line catchphrase",
  "description": "2-3 sentences, be specific to their answers, don't use generic compliments",
  "traits": ["exactly", "three", "labels"],
  "emoji": "one emoji"
}

Answers:
${lines}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.9,
      max_tokens: 300,
    });
    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) return null;
    return JSON.parse(content);
  } catch (err) {
    console.error('[openai] generation failed:', err);
    return null;
  }
}
