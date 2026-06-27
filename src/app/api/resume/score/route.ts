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
    const { resumeId, jobDescription } = body;

    if (!resumeId || !jobDescription) {
      return NextResponse.json(
        { error: "Missing required fields: resumeId, jobDescription." },
        { status: 400 }
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
You are an expert ATS (Applicant Tracking System) parser and senior technical recruiter.
Analyze the attached PDF resume against the following target Job Description.

---
JOB DESCRIPTION:
${jobDescription}
---

Evaluate the suitability and return a JSON object with:
1. "atsScore": An integer score (0 to 100) reflecting how well this resume matches the requirements. Be honest and rigorous.
2. "feedback": A detailed, formatted markdown feedback outlining:
   - **Missing Key Keywords**: Skills or tools required in the JD but absent or weak in the resume.
   - **Unquantified impact**: Bullet points in the resume that describe tasks without metrics, and how to rewrite them to add impact.
   - **Tailoring suggestions**: Specific ways to align experience sections to match the job description.

Your response MUST be a single, valid JSON object with the keys "atsScore" (number) and "feedback" (string). 
Do not include markdown code block formatting (like \`\`\`json) in the raw response, just return the raw JSON object string.
`;

    const schema: Schema = {
      type: SchemaType.OBJECT,
      properties: {
        atsScore: {
          type: SchemaType.INTEGER,
          description: "An integer score from 0 to 100 reflecting how well the resume matches the requirements.",
        },
        feedback: {
          type: SchemaType.STRING,
          description: "Detailed, formatted markdown feedback outlining Missing Key Keywords, Unquantified impact, and Tailoring suggestions.",
        },
      },
      required: ["atsScore", "feedback"],
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

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("Received empty response from Gemini API.");
    }

    // Parse the JSON output
    const analysis = JSON.parse(responseText.trim());
    const score = parseInt(analysis.atsScore);
    const feedbackText = analysis.feedback;

    if (isNaN(score)) {
      throw new Error("Invalid ATS score format returned by AI.");
    }

    // Save the analysis to the database
    const updatedResume = await prisma.resumeVersion.update({
      where: { id: resumeId },
      data: {
        atsScore: score,
        feedback: feedbackText,
      },
    });

    return NextResponse.json(updatedResume);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to score resume";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
