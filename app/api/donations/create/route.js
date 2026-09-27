import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import { getOptionalAuth } from "@/lib/auth-config";
import Donation from "@/models/Donation";
import {
  DONATION_ORDER_PREFIX,
  MAX_DONATION,
  MIN_DONATION,
  getSeva,
  sevaTitles,
} from "@/lib/donations/catalog";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { extractPincode, hasPincode } from "@/lib/donations/address";
import { generateOrderId } from "@/lib/payments/order-id";
import { donationStatusPath, orderToken } from "@/lib/payments/order-link";
import { paymentMode } from "@/lib/payments/razorpay";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Step one of giving: save who is giving, what towards, and how much.
 *
 * Deliberately separate from /api/payment/initiate, exactly as enrolment is.
 * The row exists before the gateway does, so a donor whose card was declined or
 * whose signal dropped finishes from the status page without typing their
 * address again — and so a payment that lands after the browser is gone has
 * something to be recorded against.
 *
 * Unlike a course seat, the amount here is the donor's to choose, so it is the
 * one number that comes from the request. It is still not taken as given:
 * `MIN_DONATION`/`MAX_DONATION` and whole rupees are enforced here, and the
 * stored row — never the browser — is what the gateway order is built from.
 */

/* A PAN, as the Income Tax Department issues them: ABCDE1234F. Checked only
   for shape — whether it is a real PAN is the department's business, and a
   donor who mistypes it must still get their receipt. */
const PAN_PATTERN = /^[A-Z]{5}\d{4}[A-Z]$/;

const bodySchema = z.object({
  seva: z.string().trim().min(1).max(80),
  amount: z.coerce.number().int().min(MIN_DONATION).max(MAX_DONATION),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => PHONE_PATTERN.test(v)),
  /* The PIN travels inside the address, as the donor wrote it — one box on the
     form, and the six digits pulled back out here rather than trusted from a
     field of their own. See `lib/donations/address.js`. */
  address: z.string().trim().min(10).max(300).refine(hasPincode),
  pan: z.preprocess(
    (value) => {
      const pan = String(value ?? "")
        .trim()
        .toUpperCase();
      return pan === "" ? undefined : pan;
    },
    z
      .string()
      .refine((v) => PAN_PATTERN.test(v))
      .optional(),
  ),
  locale: z.enum(["hi", "en"]).default("hi"),
});

function fail(status, error, headers) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

export async function POST(request) {
  /* Looser than enrolment's limit: a family giving from one phone on a
     festival evening is normal, and a donation cannot be "sold out" so there
     is nothing to hoard by spamming this. */
  const limit = check(clientKey(request, "donate"), {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return fail(429, "rate_limited", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid");
  const data = parsed.data;

  const seva = getSeva(data.seva);
  if (!seva) return fail(404, "not_found");

  /* One switch the temple can throw — during an audit, or while the gateway is
     being re-keyed — that closes giving without a deploy. */
  if (!(await getFlag("donations.open", true))) return fail(403, "closed");

  try {
    await dbConnect();

    const { userId } = await getOptionalAuth();
    const sevaTitle = await sevaTitles(seva);

    /* Always a new row, never a reused pending one. A donor may give twice in
       an evening — to two sevas, or the same seva for two relatives — and
       folding those into one row would lose one of the offerings and one of
       the receipts. Abandoned rows stay pending and are simply never counted. */
    const orderId = await generateOrderId(DONATION_ORDER_PREFIX);

    const donation = await Donation.create({
      orderId,
      sevaKey: seva.key,
      sevaSlug: seva.slug,
      sevaTitle,
      amount: data.amount,
      currency: "INR",
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
      pincode: extractPincode(data.address),
      ...(data.pan ? { pan: data.pan } : {}),
      ...(userId ? { clerkId: userId } : {}),
      locale: data.locale,
      meta: {
        userAgent: request.headers.get("user-agent")?.slice(0, 300) || null,
      },
    });

    const [token, statusUrl] = await Promise.all([
      orderToken(donation.orderId),
      donationStatusPath(donation.orderId, data.locale),
    ]);

    return NextResponse.json(
      {
        ok: true,
        orderId: donation.orderId,
        token,
        statusUrl,
        // With no gateway configured in production the offering is saved as
        // pending and the status page explains that payment opens shortly.
        next: paymentMode() ? "payment" : "status",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[donate] failed", error);
    return fail(500, "generic");
  }
}
