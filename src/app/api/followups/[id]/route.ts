import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { updateFollowUpSchema } from "@/lib/validations";

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;
    const body = await request.json();
    const validation = updateFollowUpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    // Check if follow-up exists
    const existing = await prisma.followUp.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Follow-up not found" }, { status: 404 });
    }

    // Update follow-up and update application lastActivity
    const [updated] = await prisma.$transaction([
      prisma.followUp.update({
        where: { id },
        data: {
          completed: data.completed,
        },
      }),
      prisma.application.update({
        where: { id: existing.applicationId },
        data: { lastActivity: new Date() },
      }),
    ]);

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update follow-up";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
