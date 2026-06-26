import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { OutreachType } from "@prisma/client";

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
    const search = searchParams.get("search");
    const applicationId = searchParams.get("applicationId");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (applicationId) {
      where.applicationId = applicationId;
    }

    if (search) {
      where.OR = [
        { output: { contains: search, mode: "insensitive" } },
        { prompt: { contains: search, mode: "insensitive" } },
        {
          application: {
            company: { contains: search, mode: "insensitive" },
          },
        },
      ];
    }

    const logs = await prisma.outreachLog.findMany({
      where,
      include: {
        application: {
          select: {
            company: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(logs);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch outreach history";
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
    const { type, prompt, output, sent, applicationId } = body;

    if (!type || !prompt || !output) {
      return NextResponse.json(
        { error: "Missing required fields: type, prompt, output." },
        { status: 400 }
      );
    }

    // Verify type is valid OutreachType enum
    if (!Object.values(OutreachType).includes(type as OutreachType)) {
      return NextResponse.json({ error: "Invalid outreach type." }, { status: 400 });
    }

    const data: {
      type: OutreachType;
      prompt: string;
      output: string;
      sent: boolean;
      applicationId?: string | null;
    } = {
      type: type as OutreachType,
      prompt,
      output,
      sent: !!sent,
    };

    if (applicationId) {
      // Verify application exists
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
      });
      if (!application) {
        return NextResponse.json({ error: "Linked application not found." }, { status: 404 });
      }
      data.applicationId = applicationId;
    }

    // Save log. If it's linked to an application, bump lastActivity of that application
    if (applicationId) {
      const [log] = await prisma.$transaction([
        prisma.outreachLog.create({ data }),
        prisma.application.update({
          where: { id: applicationId },
          data: { lastActivity: new Date() },
        }),
      ]);
      return NextResponse.json(log, { status: 201 });
    } else {
      const log = await prisma.outreachLog.create({ data });
      return NextResponse.json(log, { status: 201 });
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to save outreach log";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
