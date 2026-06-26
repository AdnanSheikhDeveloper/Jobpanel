import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { createContactSchema } from "@/lib/validations";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const applicationId = searchParams.get("applicationId");
    const search = searchParams.get("search");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (applicationId) {
      where.applicationId = applicationId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(contacts);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch contacts";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

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
    const validation = createContactSchema.safeParse(body);

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

    // Create contact and update application lastActivity
    const [contact] = await prisma.$transaction([
      prisma.contact.create({
        data: {
          name: data.name,
          email: data.email || null,
          linkedinUrl: data.linkedinUrl || null,
          role: data.role || null,
          applicationId: data.applicationId,
        },
      }),
      prisma.application.update({
        where: { id: data.applicationId },
        data: { lastActivity: new Date() },
      }),
    ]);

    return NextResponse.json(contact, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to create contact";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
