import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const label = formData.get("label") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF documents are allowed." }, { status: 400 });
    }

    // Generate a unique path for the file: user_id/timestamp_filename.pdf
    const fileExtension = file.name.split(".").pop() || "pdf";
    const uniqueFileName = `${user.id}/${Date.now()}.${fileExtension}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(uniqueFileName, file, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Supabase Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded file
    const {
      data: { publicUrl },
    } = supabase.storage.from("resumes").getPublicUrl(uploadData.path);

    // Determine if this should be marked active (default to active if it's the first resume)
    const existingCount = await prisma.resumeVersion.count();
    const shouldBeActive = existingCount === 0;

    const resumeVersion = await prisma.$transaction(async (tx) => {
      if (shouldBeActive) {
        // Ensure all others are inactive (safety check)
        await tx.resumeVersion.updateMany({
          data: { isActive: false },
        });
      }

      return await tx.resumeVersion.create({
        data: {
          label: label || `Resume ${new Date().toLocaleDateString("en-IN")}`,
          fileUrl: publicUrl,
          isActive: shouldBeActive,
        },
      });
    });

    return NextResponse.json(resumeVersion, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to upload resume";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
