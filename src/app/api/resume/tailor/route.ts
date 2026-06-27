import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { GoogleGenerativeAI, SchemaType, type Schema } from "@google/generative-ai";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { resumeId, jobDescription } = await request.json();

    if (!resumeId || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: resumeId, jobDescription." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured in environment variables." },
        { status: 500 }
      );
    }

    // Fetch the resume from DB to get the file url
    const resume = await prisma.resumeVersion.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume version not found." }, { status: 404 });
    }

    // Download the PDF file from the Supabase public URL
    const fileResponse = await fetch(resume.fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download resume file from storage: ${fileResponse.statusText}`);
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const base64Pdf = Buffer.from(arrayBuffer).toString("base64");

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are a career development expert and professional technical copywriter.
Analyze the attached PDF resume against the target Job Description:

---
JOB DESCRIPTION:
${jobDescription}
---

Your task is to generate tailored job application assets:
1. "tailoredResume": Rewrite the resume sections (especially the professional experience, summary, and skills list) in clean, recruiter-friendly Markdown format. Optimize it to hit a >90% ATS match score by incorporating relevant target keywords, resolving suitability gaps, and rewriting experience bullet points using the Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]"). Keep the formatting highly professional.
2. "coverLetter": Write a compelling, customized cover letter matching this job posting. Keep it under 350 words, with a modern, professional tone, highlighting how the experience aligns with the JD.
3. "coldEmail": Write an exact, short cold email template (under 150 words) to send to a hiring manager or recruiter. Include a clear subject line and dynamic placeholders where appropriate.

Your response must be a single, valid JSON object matching the requested schema.
`;

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        tailoredResume: {
          type: SchemaType.STRING,
          description: "The complete tailored resume in clean markdown format, fully rewritten to optimize keywords and metrics to match the job description.",
        },
        coverLetter: {
          type: SchemaType.STRING,
          description: "A professional, personalized cover letter tailored to the job description.",
        },
        coldEmail: {
          type: SchemaType.STRING,
          description: "An exact cold email pitch/template to send to recruiters or hiring managers for this role.",
        },
      },
      required: ["tailoredResume", "coverLetter", "coldEmail"],
    };

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                data: base64Pdf,
                mimeType: "application/pdf",
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = result.response.text();
    const data = JSON.parse(text);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate tailored assets";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
