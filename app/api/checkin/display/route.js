import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/connect";
import { getAdminUser } from "@/lib/auth-config";
import { codeFor, msUntilRotation, tokenFor } from "@/lib/checkin/token";
import { istDayKey } from "@/lib/panchang";
import CheckIn from "@/models/CheckIn";

/**
 * What the screen at the venue shows: the current code, and who has arrived.
 *
 * Admin-only, and that is the actual access control for check-in. The codes
 * themselves are short-lived and low-value, but the endpoint that *mints* them
 * must not be open — otherwise anyone could generate a valid code from their
 * sofa and the rotation would protect nothing.
 *
 * Polled by the display roughly twice a minute, so it stays cheap: two indexed
 * queries and an HMAC.
 */
export async function GET(request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const programId = request.nextUrl.searchParams.get("programId");
  if (!programId || !/^[0-9a-fA-F]{24}$/.test(programId)) {
    return NextResponse.json({ error: "Invalid programme" }, { status: 400 });
  }

  try {
    await dbConnect();
    const dayKey = istDayKey();

    const [count, recent] = await Promise.all([
      CheckIn.countDocuments({ programId, dayKey }),
      CheckIn.find({ programId, dayKey })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("name createdAt")
        .lean(),
    ]);

    return NextResponse.json({
      token: tokenFor(programId),
      code: codeFor(programId),
      rotatesInMs: msUntilRotation(),
      count,
      recent: recent.map((row) => ({
        name: row.name,
        at: row.createdAt,
      })),
    });
  } catch (error) {
    console.error("[checkin/display] failed", error);
    return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  }
}
