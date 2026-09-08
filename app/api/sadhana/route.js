import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import SadhanaEntry from "@/models/SadhanaEntry";

/**
 * Sync for the sadhana card.
 *
 * POST mirrors one day up; GET reads the last ninety days back down, which is
 * what a new device needs in order to show a streak that was built on the old
 * one. Both require a session and neither is the source of truth — the card
 * itself is offline-first and this endpoint is a convenience, so a 401 here is
 * a normal answer for a signed-out visitor rather than an error the UI has to
 * make a fuss about.
 */

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const entrySchema = z.object({
  date: dateSchema,
  rounds: z.number().int().min(0).max(200).optional(),
  roundsBeforeTen: z.number().int().min(0).max(200).optional(),
  mangalaArati: z.boolean().optional(),
  tulasiPuja: z.boolean().optional(),
  readingMinutes: z.number().int().min(0).max(1440).optional(),
  hearingMinutes: z.number().int().min(0).max(1440).optional(),
  sevaMinutes: z.number().int().min(0).max(1440).optional(),
  // Either "HH:MM" or cleared. An empty string is a real value here: it is how
  // the card says "this was recorded and then removed".
  wakeTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).optional(),
  sleepTime: z.union([z.string().regex(/^\d{2}:\d{2}$/), z.literal("")]).optional(),
  principles: z.boolean().optional(),
  note: z.string().max(500).optional(),
});

export async function POST(request) {
  const { userId } = await getOptionalAuth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = entrySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { date, ...fields } = parsed.data;

  await dbConnect();
  await SadhanaEntry.findOneAndUpdate(
    { clerkId: userId, date },
    { $set: fields },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const { userId } = await getOptionalAuth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  await dbConnect();
  const entries = await SadhanaEntry.find({ clerkId: userId })
    .sort({ date: -1 })
    .limit(90)
    .lean();

  // Returned as a map keyed by date, which is the shape the card already
  // holds in local storage — so restoring on a new device is a merge, not a
  // transformation.
  const byDate = {};
  for (const entry of entries) {
    const { _id, clerkId, createdAt, updatedAt, __v, date, ...fields } = entry;
    byDate[date] = fields;
  }

  return NextResponse.json({ entries: byDate });
}
