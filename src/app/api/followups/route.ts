import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { createFollowUpSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = createFollowUpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    // Check if application exists
    const application = await prisma.application.findUnique({
      where: { id: data.applicationId },
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Create follow-up and update application lastActivity
    const [followUp] = await prisma.$transaction([
      prisma.followUp.create({
        data: {
          dueDate: new Date(data.dueDate),
          note: data.note || null,
          applicationId: data.applicationId,
        },
      }),
      prisma.application.update({
        where: { id: data.applicationId },
        data: { lastActivity: new Date() },
      }),
    ]);

    return NextResponse.json(followUp, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create follow-up";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
