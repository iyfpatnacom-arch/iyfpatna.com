import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import JapaLog from "@/models/JapaLog";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rounds: z.number().int().min(0),
  beadTaps: z.number().int().min(0),
});

export async function POST(request) {
  const { userId } = await getOptionalAuth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  await dbConnect();
  await JapaLog.findOneAndUpdate(
    { clerkId: userId, date: parsed.data.date },
    { $set: { rounds: parsed.data.rounds, beadTaps: parsed.data.beadTaps } },
    { upsert: true }
  );

  return NextResponse.json({ ok: true });
}
