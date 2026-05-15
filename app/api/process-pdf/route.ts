import { NextRequest, NextResponse } from 'next/server';
// pdf-parse is CJS; use require to avoid ESM default export issue
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string; numpages: number }>;
import OpenAI from 'openai';

export const maxDuration = 60;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SECTIONING_SYSTEM_PROMPT = `You are an expert instructional designer specializing in business case studies.
Divide the case study into 4–8 logical reading sections for progressive comprehension.

RULES:
- Follow the document's natural narrative structure (e.g., company background → industry context → strategic challenge → financial data → decision options).
- Every page belongs to exactly one section. Sections must be contiguous and non-overlapping.
- Section 1 starts at page 1. The last section ends at the final page.
- Generate 2-3 Socratic thinking prompts per section that connect the content to strategic frameworks such as Porter's Five Forces, SWOT Analysis, BCG Matrix, Value Chain Analysis, Blue Ocean Strategy, or Competitive Advantage Theory.
- Section titles should be descriptive and specific to the case content.

OUTPUT (strict JSON, no markdown):
{
  "sections": [
    {
      "id": 1,
      "title": "string",
      "startPage": 1,
      "endPage": number,
      "summary": "one sentence describing what this section covers",
      "thinkingPrompts": ["question 1", "question 2", "question 3"]
    }
  ]
}

Validate that sections are contiguous and non-overlapping before responding.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfData = await pdfParse(buffer);
    const { text, numpages } = pdfData;

    if (!text || text.trim().length < 100) {
      return NextResponse.json(
        { error: 'Could not extract text. Ensure your PDF is not scanned or encrypted.' },
        { status: 422 }
      );
    }

    // Truncate text to avoid token limits (~12k chars ≈ ~3k tokens)
    const truncatedText = text.length > 50000 ? text.slice(0, 50000) + '\n...[truncated]' : text;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SECTIONING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `DOCUMENT TEXT:\n${truncatedText}\n\nTOTAL PAGES: ${numpages}`,
        },
      ],
      temperature: 0.2,
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error('Empty response from GPT-4o');

    const result = JSON.parse(raw) as { sections: unknown[] };

    // Basic validation
    if (!Array.isArray(result.sections) || result.sections.length === 0) {
      throw new Error('Invalid sections format from GPT-4o');
    }

    return NextResponse.json({ sections: result.sections, totalPages: numpages });
  } catch (err) {
    console.error('process-pdf error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
