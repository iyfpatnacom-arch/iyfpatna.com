import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getOptionalAuth } from "@/lib/auth-config";
import { findProgramForCode, verifyToken } from "@/lib/checkin/token";
import { istDayKey } from "@/lib/panchang";
import CheckIn from "@/models/CheckIn";
import Program from "@/models/Program";
import Registration from "@/models/Registration";
import Attendance from "@/models/Attendance";

/**
 * Recording a check-in.
 *
 * Two ways in, one path out. A camera scan arrives with a `programId` and the
 * token from the QR; a typed six-digit `code` arrives with no programme at all
 * and is matched against the active ones. Either way the code has to be valid
 * for the current minute or the one either side — see `lib/checkin/token.js`
 * for why that is the whole mechanism.
 *
 * No session is required. Insisting on one would exclude precisely the people
 * this is for: a first-time visitor at a Sunday programme, standing in a
 * doorway. A signed-in person gets their `clerkId` recorded so the check-in
 * shows on their dashboard, and that is the only difference.
 */

const bodySchema = z
  .object({
    programId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
    token: z.string().min(8).max(32).optional(),
    code: z.string().regex(/^\d{6}$/).optional(),
    name: z.string().trim().min(1).max(120),
    phone: z.string().trim().min(6).max(20),
  })
  // A token is only meaningful alongside the programme it was minted for.
  .refine((value) => (value.token ? Boolean(value.programId) : Boolean(value.code)), {
    message: "Either a programme token or a code is required",
  });

export async function POST(request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { programId, token, code, name, phone } = parsed.data;

  let db;
  try {
    db = await dbConnect();
  } catch (error) {
    console.error("[checkin] database unreachable", error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 503 });
  }

  try {
    /* Resolve which programme this is for, and prove the code belongs to it. */
    let program;
    if (token) {
      if (!verifyToken(programId, token)) {
        return NextResponse.json({ ok: false, error: "expired" }, { status: 403 });
      }
      program = await Program.findById(programId).lean();
    } else {
      const active = await Program.find({ isActive: true }).select("_id title").lean();
      const matchedId = findProgramForCode(
        active.map((row) => String(row._id)),
        code
      );
      if (!matchedId) {
        return NextResponse.json({ ok: false, error: "invalid_code" }, { status: 403 });
      }
      program = active.find((row) => String(row._id) === matchedId);
    }

    if (!program) {
      return NextResponse.json({ ok: false, error: "no_programme" }, { status: 404 });
    }

    const { userId } = await getOptionalAuth();
    const dayKey = istDayKey();

    /* Link an existing registration if this person had signed up. Matching on
       the phone number is what the volunteers at the door already do, and it
       is the one field both records reliably share. */
    const registration = await Registration.findOne({
      itemType: "program",
      itemId: program._id,
      phone,
    })
      .sort({ createdAt: -1 })
      .lean();

    const existing = await CheckIn.findOne({
      programId: program._id,
      dayKey,
      phone,
    }).lean();

    const record = await CheckIn.findOneAndUpdate(
      { programId: program._id, dayKey, phone },
      {
        $set: {
          name,
          clerkId: userId ?? null,
          registrationId: registration?._id ?? null,
          programTitle: {
            hi: program.title?.hi ?? "",
            en: program.title?.en ?? "",
          },
          source: token ? "qr" : "code",
        },
      },
      { upsert: true, returnDocument: "after" }
    );

    /* Keep the registration view honest too, so a programme's sign-up list and
       its door list do not disagree about who turned up. */
    if (registration) {
      await Registration.updateOne(
        { _id: registration._id },
        { $set: { status: "attended" } }
      );
      await Attendance.findOneAndUpdate(
        { registrationId: registration._id },
        { $set: { status: "attended", clerkId: userId ?? null, markedBy: "self-checkin" } },
        { upsert: true }
      );
    }

    return NextResponse.json({
      ok: true,
      alreadyCheckedIn: Boolean(existing),
      program: { id: String(program._id), title: program.title },
      at: record.createdAt,
    });
  } catch (error) {
    console.error("[checkin] failed", error);
    return NextResponse.json({ ok: false, error: "generic" }, { status: 500 });
  }
}
