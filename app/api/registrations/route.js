import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import { getOptionalAuth } from "@/lib/auth-config";
import Program from "@/models/Program";
import Course from "@/models/Course";
import Registration from "@/models/Registration";
import { sendJoinNotification } from "@/lib/notifications/index.js";

const bodySchema = z.object({
  itemType: z.enum(["program", "course"]),
  itemId: z.string().min(1),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(20),
  note: z.string().trim().max(500).optional(),
  locale: z.enum(["hi", "en"]).default("hi"),
});

export async function POST(request) {
  const registrationsOpen = await getFlag("registrations.programsOpen", true);
  if (!registrationsOpen) {
    return NextResponse.json(
      { error: "Registrations are currently closed." },
      { status: 403 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const data = parsed.data;

  await dbConnect();
  const Model = data.itemType === "course" ? Course : Program;
  const item = await Model.findById(data.itemId).lean();
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { userId } = await getOptionalAuth();

  const registration = await Registration.create({
    itemType: data.itemType,
    itemId: item._id,
    itemModel: data.itemType === "course" ? "Course" : "Program",
    itemTitle: item.title,
    clerkId: userId ?? undefined,
    name: data.name,
    email: data.email,
    phone: data.phone,
    note: data.note,
  });

  await sendJoinNotification({
    registrationId: registration._id,
    itemType: data.itemType,
    item,
    name: data.name,
    email: data.email,
    phone: data.phone,
    locale: data.locale,
  });

  return NextResponse.json({ ok: true, id: registration._id.toString() });
}
