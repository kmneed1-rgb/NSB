import { GoogleGenAI } from '@google/genai';

export interface PaperQuestion {
  type: 'mcq' | 'short' | 'long';
  number: number;
  question: string;
  options?: string[];
  marks: number;
  answer: string;
}

export interface GeneratedPaper {
  title: string;
  className: string;
  subject: string;
  duration: string;
  totalMarks: number;
  instructions: string[];
  questions: PaperQuestion[];
}

export interface PaperGenerateInput {
  apiKey: string;
  className: string;
  subject: string;
  examTitle: string;
  topics: string;
  language: 'English' | 'Urdu';
  mcqCount: number;
  shortCount: number;
  longCount: number;
  totalMarks: number;
  duration: string;
}

function extractJson(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export async function testGeminiConnection(apiKey: string): Promise<void> {
  const key = apiKey.trim();
  if (!key) throw new Error('Gemini API key is missing.');
  const ai = new GoogleGenAI({ apiKey: key });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Reply with the single word OK.',
  });
  const text = (response.text || '').trim();
  if (!text) throw new Error('Gemini returned an empty response.');
}

export async function generateExamPaper(input: PaperGenerateInput): Promise<GeneratedPaper> {
  const key = input.apiKey.trim();
  if (!key) throw new Error('Gemini API key is missing. Ask the developer to set it in the control portal.');

  const ai = new GoogleGenAI({ apiKey: key });
  const prompt = `You are an exam paper writer for NSB1 School.
Create a complete school exam paper and return ONLY valid JSON (no markdown) with this shape:
{
  "title": string,
  "className": string,
  "subject": string,
  "duration": string,
  "totalMarks": number,
  "instructions": string[],
  "questions": [
    {
      "type": "mcq" | "short" | "long",
      "number": number,
      "question": string,
      "options": string[] (only for mcq, exactly 4 options labeled in the text as A-D if needed),
      "marks": number,
      "answer": string
    }
  ]
}

Rules:
- Class: ${input.className}
- Subject: ${input.subject}
- Exam title: ${input.examTitle}
- Topics / chapters: ${input.topics || 'Cover the core syllabus for this class and subject'}
- Language of questions: ${input.language}
- Include exactly ${input.mcqCount} MCQs, ${input.shortCount} short questions, ${input.longCount} long questions.
- Total marks should add up to about ${input.totalMarks}.
- Duration: ${input.duration}
- Questions must be original, age-appropriate, and clearly numbered.
- For MCQs, options must be an array of 4 strings without A/B/C/D prefixes.
- Answers must be complete enough for a teacher answer key.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  const raw = response.text || '';
  if (!raw.trim()) throw new Error('Gemini returned an empty paper.');

  let parsed: GeneratedPaper;
  try {
    parsed = JSON.parse(extractJson(raw)) as GeneratedPaper;
  } catch {
    throw new Error('Gemini did not return a valid paper. Try again.');
  }

  if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Generated paper had no questions.');
  }

  return {
    title: parsed.title || input.examTitle,
    className: parsed.className || input.className,
    subject: parsed.subject || input.subject,
    duration: parsed.duration || input.duration,
    totalMarks: Number(parsed.totalMarks) || input.totalMarks,
    instructions: Array.isArray(parsed.instructions) ? parsed.instructions : [],
    questions: parsed.questions.map((q, i) => ({
      type: q.type === 'mcq' || q.type === 'short' || q.type === 'long' ? q.type : 'short',
      number: Number(q.number) || i + 1,
      question: String(q.question || '').trim(),
      options: Array.isArray(q.options) ? q.options.map(String) : undefined,
      marks: Number(q.marks) || 0,
      answer: String(q.answer || '').trim(),
    })).filter(q => q.question),
  };
}
