import { NextResponse, type NextRequest } from "next/server";
import { Resend } from "resend";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    const isDev = process.env.NODE_ENV === "development";
    const cronSecret = process.env.CRON_SECRET;

    // Secure the route in production
    if (!isDev && (!authHeader || authHeader !== `Bearer ${cronSecret}`)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();

    // 1. Fetch incomplete follow-ups due today or overdue
    const dueFollowUps = await prisma.followUp.findMany({
      where: {
        completed: false,
        dueDate: {
          lte: now,
        },
      },
      include: {
        application: {
          select: {
            company: true,
            role: true,
          },
        },
      },
      orderBy: {
        dueDate: "asc",
      },
    });

    // 2. Fetch stale applications (Applied stage, lastActivity > 5 days ago)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const staleApps = await prisma.application.findMany({
      where: {
        status: "APPLIED",
        lastActivity: {
          lt: fiveDaysAgo,
        },
      },
      orderBy: {
        lastActivity: "asc",
      },
    });

    // 3. Skip sending email if there are no pending actions
    if (dueFollowUps.length === 0 && staleApps.length === 0) {
      return NextResponse.json({ message: "No actions required. Digest email skipped." });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.ALLOWED_EMAIL;

    if (!resendApiKey || !recipientEmail) {
      return NextResponse.json(
        { error: "Resend is not configured correctly (missing RESEND_API_KEY or ALLOWED_EMAIL)." },
        { status: 500 }
      );
    }

    // 4. Construct email HTML template
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    };

    const getDaysBetween = (date: Date) => {
      const diffTime = Math.abs(now.getTime() - date.getTime());
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    };

    let followUpsHtml = "";
    if (dueFollowUps.length > 0) {
      followUpsHtml = `
        <h2 style="color: #8b5cf6; font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
          📅 Due Follow-Ups (${dueFollowUps.length})
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">Target Company & Role</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">Due Date</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">Reminder Note</th>
            </tr>
          </thead>
          <tbody>
            ${dueFollowUps
              .map(
                (item) => `
              <tr style="color: #f8fafc; font-size: 14px; border-bottom: 1px solid #0f172a;">
                <td style="padding: 12px; font-weight: bold;">
                  ${item.application.company} <br/>
                  <span style="font-weight: normal; font-size: 12px; color: #94a3b8;">${item.application.role}</span>
                </td>
                <td style="padding: 12px; color: #fb7185;">${formatDate(item.dueDate)}</td>
                <td style="padding: 12px; color: #cbd5e1; font-style: italic;">${item.note || "No note added."}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    let staleAppsHtml = "";
    if (staleApps.length > 0) {
      staleAppsHtml = `
        <h2 style="color: #f59e0b; font-size: 18px; margin-top: 24px; margin-bottom: 12px; border-bottom: 1px solid #1e293b; padding-bottom: 6px;">
          ⚠️ Stale Applications (${staleApps.length})
        </h2>
        <p style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">
          These applications have been in the "Applied" status for 5+ days with no activity:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <thead>
            <tr style="text-align: left; color: #94a3b8; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">Company & Role</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">Last Activity</th>
              <th style="padding: 8px 12px; border-bottom: 1px solid #1e293b;">Stale Duration</th>
            </tr>
          </thead>
          <tbody>
            ${staleApps
              .map(
                (app) => `
              <tr style="color: #f8fafc; font-size: 14px; border-bottom: 1px solid #0f172a;">
                <td style="padding: 12px; font-weight: bold;">
                  ${app.company} <br/>
                  <span style="font-weight: normal; font-size: 12px; color: #94a3b8;">${app.role}</span>
                </td>
                <td style="padding: 12px; color: #cbd5e1;">${formatDate(app.lastActivity)}</td>
                <td style="padding: 12px; color: #fbbf24; font-weight: bold;">${getDaysBetween(app.lastActivity)} days ago</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>CareerHQ Daily Action Digest</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #020617; color: #f8fafc; margin: 0; padding: 20px;">
          <div style="max-width: 600px; mx-auto; background-color: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 24px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);">
            
            <!-- Header -->
            <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #1e293b; padding-bottom: 16px;">
              <div style="display: flex; align-items: center;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: linear-gradient(to top right, #7c3aed, #6366f1); display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; color: white; margin-right: 8px;">
                  C
                </div>
                <span style="font-weight: bold; font-size: 18px; letter-spacing: -0.5px; color: #f8fafc;">CareerHQ Action Digest</span>
              </div>
              <span style="font-size: 12px; color: #64748b;">${formatDate(now)}</span>
            </div>

            <!-- Intro Message -->
            <p style="font-size: 15px; line-height: 1.5; color: #cbd5e1; margin-top: 20px;">
              Hello Adnan, here is your career search action list for today:
            </p>

            <!-- Contents -->
            ${followUpsHtml}
            ${staleAppsHtml}

            <!-- CTA Section -->
            <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #1e293b;">
              <a href="https://careerhq-panel.vercel.app/" style="display: inline-block; background: linear-gradient(to right, #7c3aed, #4f46e5); color: white; font-weight: bold; font-size: 14px; text-decoration: none; padding: 12px 24px; border-radius: 10px; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.25);">
                Open Command Center
              </a>
              <p style="font-size: 11px; color: #64748b; margin-top: 16px; margin-bottom: 0;">
                You are receiving this automated daily update because you configured CareerHQ email cron reports.
              </p>
            </div>

          </div>
        </body>
      </html>
    `;

    // 5. Send email via Resend
    const resend = new Resend(resendApiKey);

    await resend.emails.send({
      from: "CareerHQ Digest <onboarding@resend.dev>",
      to: recipientEmail,
      subject: `CareerHQ Action List: ${dueFollowUps.length} follow-ups, ${staleApps.length} stale applications`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      followUpsSent: dueFollowUps.length,
      staleAppsSent: staleApps.length,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to generate digest";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
