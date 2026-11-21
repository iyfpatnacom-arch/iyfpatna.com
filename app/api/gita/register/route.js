import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import { getOptionalAuth } from "@/lib/auth-config";
import GitaRegistration from "@/models/GitaRegistration";
import {
  EVENT_KEYS,
  GITA_ORDER_PREFIX,
  eventTitles,
  getFestival,
  isRegistrationOpen,
  normalizeEvents,
  priceFor,
} from "@/lib/gita-event/catalog";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import { generateOrderId } from "@/lib/payments/order-id";
import { gitaStatusPath, orderToken } from "@/lib/payments/order-link";
import { paymentMode } from "@/lib/payments/gateways";
import { check, clientKey } from "@/lib/rate-limit";

/**
 * Step one of registering for the Gita festival: save who is coming, to what,
 * and mint an order.
 *
 * Deliberately separate from /api/payment/initiate, exactly as enrolment and
 * giving are. The row exists before the gateway does, so somebody whose UPI app
 * never came back finishes from their ticket page without filling the form in
 * again — and a payment that lands after the browser is gone has something to
 * be recorded against.
 *
 * The price is never taken from the request. The browser sends which events
 * were ticked; `priceFor` turns that into an amount from the catalog, and the
 * gateway is charged from the stored row. The combined fee is a property of the
 * set, so there is no discount for a client to claim and no coupon to forge.
 */

const optionalAge = z.preprocess(
  (value) => (value === "" || value == null ? undefined : Number(value)),
  z.number().int().min(5).max(99).optional(),
);

const optionalText = (max) =>
  z.preprocess((value) => {
    const text = String(value ?? "").trim();
    return text === "" ? undefined : text;
  }, z.string().max(max).optional());

const bodySchema = z.object({
  /* At least one, both at most, and only keys the catalog knows. `normalizeEvents`
     does the narrowing so the browser cannot smuggle in a third event or ask
     for the same one twice to move the total. */
  events: z
    .array(z.enum(EVENT_KEYS))
    .min(1)
    .max(EVENT_KEYS.length)
    .transform(normalizeEvents)
    .refine((events) => events.length > 0),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((v) => PHONE_PATTERN.test(v)),
  age: optionalAge,
  occupation: z.enum(["student", "working", "other"]),
  /* Asked for, and required: the mahotsav is seated separately and the two
     WhatsApp groups are split the same way, so a blank here is a row somebody
     has to chase on the phone. Nothing is posted to anybody, which is why
     there is no address beside it. */
  gender: z.enum(["male", "female", "other"]),
  institution: optionalText(120),
  referral: optionalText(80),
  locale: z.enum(["hi", "en"]).default("hi"),
});

function fail(status, error, headers) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

export async function POST(request) {
  /* Looser than enrolment's ten: a quiz is registered for by whole families and
     whole hostel rooms off one WiFi, and there is no seat to hoard. */
  const limit = check(clientKey(request, "gita"), { limit: 20, windowMs: 10 * 60 * 1000 });
  if (!limit.allowed) {
    return fail(429, "rate_limited", { "Retry-After": String(limit.retryAfterSeconds) });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "invalid");
  const data = parsed.data;

  const festival = getFestival();

  /* One switch to close registration without a deploy — the night before the
     quiz, or when the group is full. The catalog's own flag is the other, and
     either closing is enough. */
  const flagOpen = await getFlag("gita.registrationsOpen", true);
  if (!flagOpen || !isRegistrationOpen()) return fail(403, "closed");

  try {
    await dbConnect();

    const scope = { festivalSlug: festival.slug, phone: data.phone };

    /* One registration per phone per festival. Somebody who has already paid
       and taps Register again is sent to their ticket, not charged twice.
       Upgrading from one event to both is a WhatsApp message to the helpline,
       not a second row with a second order ID — two paid rows for one person
       would be two passes and two lines in the register. */
    const paid = await GitaRegistration.findOne(
      { ...scope, "payment.status": "success" },
      { orderId: 1 },
    ).lean();
    if (paid) {
      return NextResponse.json({
        ok: true,
        already: true,
        orderId: paid.orderId,
        statusUrl: await gitaStatusPath(paid.orderId, data.locale),
      });
    }

    const { userId } = await getOptionalAuth();
    const { amount, fullAmount, currency } = priceFor(data.events);

    const details = {
      events: data.events,
      eventTitles: eventTitles(data.events),
      amount,
      fullAmount,
      currency,
      name: data.name,
      email: data.email,
      occupation: data.occupation,
      gender: data.gender,
      institution: data.institution ?? null,
      referral: data.referral ?? null,
      locale: data.locale,
      meta: { userAgent: request.headers.get("user-agent")?.slice(0, 300) || null },
    };
    if (data.age !== undefined) details.age = data.age;
    if (userId) details.clerkId = userId;

    /* An unpaid attempt for the same phone is picked up again rather than left
       behind as a second row: the admin list should hold one line per person,
       and an order ID they may already have noted keeps working. This is also
       how someone who ticked one box, abandoned the payment and came back for
       both ends up paying the combined fee against the same order. */
    let row = await GitaRegistration.findOneAndUpdate(
      { ...scope, "payment.status": { $ne: "success" } },
      { $set: details },
      { sort: { createdAt: -1 }, returnDocument: "after" },
    ).lean();

    if (!row) {
      const orderId = await generateOrderId(GITA_ORDER_PREFIX);
      row = (
        await GitaRegistration.create({
          orderId,
          festivalSlug: festival.slug,
          phone: data.phone,
          ...details,
        })
      ).toObject();
    }

    const [token, statusUrl] = await Promise.all([
      orderToken(row.orderId),
      gitaStatusPath(row.orderId, data.locale),
    ]);

    return NextResponse.json(
      {
        ok: true,
        orderId: row.orderId,
        token,
        statusUrl,
        amount,
        /* With no gateway configured in production the registration is saved as
           pending and the ticket page explains that payment opens shortly. */
        next: paymentMode() ? "payment" : "status",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[gita/register] failed", error);
    return fail(500, "generic");
  }
}
