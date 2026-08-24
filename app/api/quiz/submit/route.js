import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import QuizScore from "@/models/QuizScore";

const bodySchema = z.object({
  chapter: z.number().int(),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
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
  await QuizScore.create({ clerkId: userId, ...parsed.data });

  return NextResponse.json({ ok: true });
}
