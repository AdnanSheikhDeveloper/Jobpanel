import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { updateApplicationSchema } from "@/lib/validations";

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
    const validation = updateApplicationSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: validation.error.format() }, { status: 400 });
    }

    const data = validation.data;

    // Check if application exists
    const existing = await prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    // Auto-update lastActivity if status changes, unless lastActivity is explicitly provided
    const updateData: {
      company?: string;
      role?: string;
      location?: string | null;
      salaryMin?: number | null;
      salaryMax?: number | null;
      salaryCurrency?: string;
      jobUrl?: string | null;
      status?: typeof data.status;
      platform?: typeof data.platform;
      notes?: string | null;
      appliedDate?: Date;
      lastActivity?: Date;
    } = {
      company: data.company,
      role: data.role,
      location: data.location,
      salaryMin: data.salaryMin,
      salaryMax: data.salaryMax,
      salaryCurrency: data.salaryCurrency,
      jobUrl: data.jobUrl,
      status: data.status,
      platform: data.platform,
      notes: data.notes,
    };

    if (data.appliedDate) {
      updateData.appliedDate = new Date(data.appliedDate);
    }

    if (data.lastActivity) {
      updateData.lastActivity = new Date(data.lastActivity);
    } else if (data.status && data.status !== existing.status) {
      updateData.lastActivity = new Date();
    }

    const updated = await prisma.application.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update application";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, props: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await props.params;

    const existing = await prisma.application.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    await prisma.application.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: "Application deleted successfully" });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to delete application";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
