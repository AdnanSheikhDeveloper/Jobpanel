import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    // Shift to IST timezone for day boundary (UTC+5:30)
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);

    // Today start and end in IST
    const istStart = new Date(nowIST);
    istStart.setUTCHours(0, 0, 0, 0);
    const todayStartUtc = new Date(istStart.getTime() - istOffset);

    const istEnd = new Date(nowIST);
    istEnd.setUTCHours(23, 59, 59, 999);
    const todayEndUtc = new Date(istEnd.getTime() - istOffset);

    // Normalized date for unique key in DailyGoal (UTC 00:00:00 of the normalized day)
    const dateNormalized = new Date(todayStartUtc);
    dateNormalized.setUTCHours(0, 0, 0, 0);

    // 1. Calculate accomplishments for today dynamically
    const applyDone = await prisma.application.count({
      where: {
        appliedDate: {
          gte: todayStartUtc,
          lte: todayEndUtc,
        },
        status: {
          not: "WISHLIST",
        },
      },
    });

    const outreachDone = await prisma.outreachLog.count({
      where: {
        createdAt: {
          gte: todayStartUtc,
          lte: todayEndUtc,
        },
        sent: true,
      },
    });

    // 2. Fetch or create DailyGoal
    const dailyGoal = await prisma.dailyGoal.upsert({
      where: { date: dateNormalized },
      update: {
        applyDone,
        outreachDone,
      },
      create: {
        date: dateNormalized,
        applyTarget: 5,
        applyDone,
        outreachTarget: 10,
        outreachDone,
      },
    });

    // 3. Fetch all applications to calculate funnel and platform breakdowns in memory
    const allApps = await prisma.application.findMany();

    // 4. Funnel counts (include WISHLIST)
    const funnel: Record<string, number> = {
      WISHLIST: 0,
      APPLIED: 0,
      SCREENING: 0,
      INTERVIEW: 0,
      TECHNICAL: 0,
      HR_ROUND: 0,
      OFFER: 0,
      REJECTED: 0,
      GHOSTED: 0,
      WITHDRAWN: 0,
    };

    allApps.forEach((app) => {
      funnel[app.status] = (funnel[app.status] || 0) + 1;
    });

    // 5. Rates Calculations (exclude WISHLIST from baseline)
    const totalAppsExcludingWishlist = allApps.filter((app) => app.status !== "WISHLIST").length;
    
    const responses = allApps.filter(
      (app) =>
        app.status !== "WISHLIST" &&
        app.status !== "APPLIED" &&
        app.status !== "GHOSTED"
    ).length;

    const interviews = allApps.filter((app) =>
      ["INTERVIEW", "TECHNICAL", "HR_ROUND", "OFFER"].includes(app.status)
    ).length;

    const offers = allApps.filter((app) => app.status === "OFFER").length;

    const rates = {
      totalApplications: totalAppsExcludingWishlist,
      responseRate:
        totalAppsExcludingWishlist > 0
          ? Math.round((responses / totalAppsExcludingWishlist) * 100)
          : 0,
      interviewRate:
        totalAppsExcludingWishlist > 0
          ? Math.round((interviews / totalAppsExcludingWishlist) * 100)
          : 0,
      offerRate:
        totalAppsExcludingWishlist > 0
          ? Math.round((offers / totalAppsExcludingWishlist) * 100)
          : 0,
    };

    // 6. Platform breakdown
    const platformBreakdown: Record<string, { total: number; responses: number; rate: number }> = {};
    allApps.forEach((app) => {
      if (app.status === "WISHLIST") return;
      const plat = app.platform;
      if (!platformBreakdown[plat]) {
        platformBreakdown[plat] = { total: 0, responses: 0, rate: 0 };
      }
      platformBreakdown[plat].total += 1;
      const isResponse = !["APPLIED", "GHOSTED"].includes(app.status);
      if (isResponse) {
        platformBreakdown[plat].responses += 1;
      }
    });

    Object.keys(platformBreakdown).forEach((plat) => {
      const item = platformBreakdown[plat];
      item.rate = item.total > 0 ? Math.round((item.responses / item.total) * 100) : 0;
    });

    // Convert platformBreakdown object into an array for charts
    const platformStats = Object.entries(platformBreakdown).map(([platform, data]) => ({
      platform,
      total: data.total,
      responses: data.responses,
      rate: data.rate,
    }));

    // 7. Stale Applications (APPLIED status, lastActivity older than 5 days)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    const staleApplications = await prisma.application.findMany({
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

    // 8. This week vs Last week applied counts (calendar weeks, Mon-Sun)
    const getMonday = (d: Date) => {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      monday.setHours(0, 0, 0, 0);
      return monday;
    };

    const thisMondayIST = getMonday(new Date(nowIST));
    const thisMondayUtc = new Date(thisMondayIST.getTime() - istOffset);

    const lastMondayIST = new Date(thisMondayIST);
    lastMondayIST.setDate(lastMondayIST.getDate() - 7);
    const lastMondayUtc = new Date(lastMondayIST.getTime() - istOffset);

    const thisWeekCount = await prisma.application.count({
      where: {
        appliedDate: {
          gte: thisMondayUtc,
        },
        status: {
          not: "WISHLIST",
        },
      },
    });

    const lastWeekCount = await prisma.application.count({
      where: {
        appliedDate: {
          gte: lastMondayUtc,
          lt: thisMondayUtc,
        },
        status: {
          not: "WISHLIST",
        },
      },
    });

    // 9. 4-Week Trend
    const weeklyTrend = [];
    for (let i = 0; i < 4; i++) {
      const wStart = new Date(thisMondayUtc);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);

      const count = await prisma.application.count({
        where: {
          appliedDate: {
            gte: wStart,
            lt: wEnd,
          },
          status: {
            not: "WISHLIST",
          },
        },
      });

      const label = `Wk of ${wStart.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })}`;
      weeklyTrend.unshift({ label, count });
    }

    return NextResponse.json({
      dailyGoal,
      funnel,
      rates,
      platformStats,
      staleApplications,
      thisWeekCount,
      lastWeekCount,
      weeklyTrend,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to compile summary";
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
    const { applyTarget, outreachTarget } = body;

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowIST = new Date(now.getTime() + istOffset);
    const istStart = new Date(nowIST);
    istStart.setUTCHours(0, 0, 0, 0);
    const todayStartUtc = new Date(istStart.getTime() - istOffset);

    const dateNormalized = new Date(todayStartUtc);
    dateNormalized.setUTCHours(0, 0, 0, 0);

    const updateData: { applyTarget?: number; outreachTarget?: number } = {};
    if (typeof applyTarget === "number") updateData.applyTarget = applyTarget;
    if (typeof outreachTarget === "number") updateData.outreachTarget = outreachTarget;

    const updated = await prisma.dailyGoal.upsert({
      where: { date: dateNormalized },
      update: updateData,
      create: {
        date: dateNormalized,
        applyTarget: applyTarget ?? 5,
        applyDone: 0,
        outreachTarget: outreachTarget ?? 10,
        outreachDone: 0,
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Failed to update daily targets";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
