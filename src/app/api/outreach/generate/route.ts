import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `
You are an expert recruiter outreach assistant writing on behalf of Adnan Sheikh, an experienced Full-Stack and React Native Developer.

Here is Adnan's background (ONLY use this real experience, never invent other companies or projects):
- Role: Full-Stack and React Native Developer
- Total Experience: 3 years
- Key Achievement: Led a 4-member developer team at Afucent Technologies.
- Projects:
  1. **Adhan**: An Islamic prayer-time application. Developed custom native modules for both iOS and Android platforms, and integrated Firebase push notifications for alerts.
  2. **Slotifix**: A B2B scheduling software-as-a-service (SaaS) platform, featuring deep integrations with Google Calendar, Google Meet, and Zoom APIs.
  3. **UAE Retail Banking Platform**: A consumer web application built using Next.js, Node.js, PostgreSQL, and Prisma ORM.
  4. **Fanash Beauty**: A high-performance beauty services e-commerce app built using React Native CLI.

Outreach Requirements:
1. The output MUST be in plain text. DO NOT use any markdown formatting (no bold '**', no hashes '#', no bullet lists '*', no italics, no HTML). Use standard line breaks for paragraphs.
2. The tone must be professional, warm, personalized, and concise. Never sound generic or like automated spam.
3. Write for the specific outreach channel:
   - **LINKEDIN_DM**: Under 150 words. Hook first, briefly cite one relevant project matching the requirement, and ask for a quick 10-minute chat.
   - **COLD_EMAIL**: Include a Subject Line at the very top. Keep the email body short, structured, value-proposition focused, with a clear call to action.
   - **COVER_LETTER**: A highly tailored, modern, short cover letter highlighting relevant projects.
   - **FOLLOW_UP**: A very brief check-in (2-3 sentences), warm and reference-focused.
4. If a key job requirement is provided, naturally align Adnan's corresponding project (e.g., if mobile native features are requested, highlight Adhan; if scheduling/integrations are requested, highlight Slotifix; if finance/Next.js/Node is requested, highlight the UAE Banking app).
`;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "AI service is not configured (missing GEMINI_API_KEY)." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { company, role, messageType, keyRequirement } = body;

    if (!company || !role || !messageType) {
      return NextResponse.json(
        { error: "Missing required fields: company, role, messageType." },
        { status: 400 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });

    const prompt = `
Generate outreach text for:
- Target Company: ${company}
- Target Role: ${role}
- Outreach Type: ${messageType}
${keyRequirement ? `- Key Job Requirement: ${keyRequirement}` : ""}

Ensure the response contains only the generated message itself (and a subject line if it is a COLD_EMAIL), following the system prompt rules. Do not add conversational intro/outro text (like "Here is your message:").
`;

    const result = await model.generateContent(prompt);

    const response = result.response;
    let text = response.text() || "";

    // Clean up any remaining markdown blocks or backticks just in case
    text = text.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "");

    return NextResponse.json({ draft: text.trim() });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate outreach";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
