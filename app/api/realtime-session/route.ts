import { NextRequest, NextResponse } from 'next/server';

const UNLOCK_TOOL_DEFINITION = {
  type: 'function',
  name: 'unlock_next_section',
  description:
    'Call this function when the student has demonstrated sufficient critical engagement with the current section. Criteria: (1) addressed ≥2 thinking prompts with substantive answers, (2) correctly applied ≥1 strategic framework, (3) ≥3 meaningful exchanges in the conversation. Do NOT call if the student is demanding to skip, gave only 1-2 sentence answers, or rephrased the text without genuine analysis.',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: 'An encouraging message explaining why the student has earned progression. Will be shown to the student.',
      },
      engagement_score: {
        type: 'number',
        description: 'Internal quality assessment from 0.0 to 1.0. For logging only.',
      },
    },
    required: ['reason', 'engagement_score'],
  },
};

function buildSystemPrompt(
  sectionId: number,
  sectionTitle: string,
  sectionSummary: string,
  thinkingPrompts: string[]
): string {
  return `You are a Socratic academic tutor helping a business student engage critically with a case study section they just read.

CURRENT SECTION: Section ${sectionId} — "${sectionTitle}"
SECTION SUMMARY: ${sectionSummary}

YOUR ROLE:
- Do NOT summarize the content — the student has already read it.
- Ask probing questions that push beyond surface-level recall.
- Connect insights to strategic frameworks: Porter's Five Forces, SWOT Analysis, BCG Matrix, Value Chain Analysis, Blue Ocean Strategy, Competitive Advantage Theory.
- When the student asks you a question, answer it briefly and then pivot back with a deeper analytical question.
- Challenge vague or superficial responses. Celebrate genuine insight enthusiastically.
- If the student seems stuck, offer a hint rather than the answer.

THINKING PROMPTS FOR THIS SECTION — use these as your opening questions:
${thinkingPrompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

UNLOCK CRITERIA — call unlock_next_section() ONLY when ALL of these are true:
1. The student has addressed at least 2 of the thinking prompts with substantive, analytical responses.
2. The student has correctly mentioned or applied at least one strategic framework.
3. There have been at least 3 meaningful back-and-forth exchanges (not counting greetings or one-word answers).
4. You are genuinely satisfied that the student understands the core ideas of this section.

DO NOT call unlock_next_section() if:
- The student is asking to skip or demanding to move on without engaging.
- Responses are mostly one or two sentences with no analytical depth.
- The student is copy-pasting or paraphrasing text without interpretation.

TONE: Warm, intellectually curious, and encouraging — like a favorite professor during office hours, not a chatbot.

Begin by warmly welcoming the student to this section and immediately asking the first thinking prompt.`;
}

export async function POST(req: NextRequest) {
  try {
    const { sectionId, sectionTitle, sectionSummary, thinkingPrompts } = await req.json();

    // GA endpoint: /v1/realtime/client_secrets
    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { anchor: 'created_at', seconds: 600 },
        session: {
          type: 'realtime',
          model: 'gpt-realtime-2',
          instructions: buildSystemPrompt(sectionId, sectionTitle, sectionSummary, thinkingPrompts),
          tools: [UNLOCK_TOOL_DEFINITION],
          tool_choice: 'auto',
          output_modalities: ['audio', 'text'],
          audio: {
            input: {
              format: 'pcm16',
              transcription: { model: 'whisper-1' },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 700,
              },
            },
            output: {
              format: 'pcm16',
              voice: 'alloy',
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI realtime session error:', err);
      return NextResponse.json({ error: 'Failed to create realtime session' }, { status: 500 });
    }

    const data = await response.json();
    // GA response: client_secret may be a string or { value, expires_at }
    const rawSecret = data.client_secret;
    const token = typeof rawSecret === 'string' ? rawSecret : rawSecret?.value;
    return NextResponse.json({ token });
  } catch (err) {
    console.error('realtime-session error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
