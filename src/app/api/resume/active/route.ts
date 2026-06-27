import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resumes = await prisma.resumeVersion.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(resumes);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch resumes";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing resume ID." }, { status: 400 });
    }

    // Verify resume exists
    const resume = await prisma.resumeVersion.findUnique({
      where: { id },
    });

    if (!resume) {
      return NextResponse.json({ error: "Resume version not found." }, { status: 404 });
    }

    // Atomic transaction to deactivate all resumes and activate the selected one
    const updatedResume = await prisma.$transaction(async (tx) => {
      await tx.resumeVersion.updateMany({
        data: { isActive: false },
      });

      return await tx.resumeVersion.update({
        where: { id },
        data: { isActive: true },
      });
    });

    return NextResponse.json(updatedResume);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to toggle active resume";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
