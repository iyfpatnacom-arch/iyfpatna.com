import { NextResponse } from "next/server";
import { z } from "zod";
import { dbConnect } from "@/lib/db/connect";
import { getFlag } from "@/lib/flags";
import { istDayKey } from "@/lib/panchang";
import { normalizePhone, PHONE_PATTERN } from "@/lib/courses/phone";
import {
  BOOK_SALE_ORDER_PREFIX,
  MAX_PER_TITLE,
  describeItems,
  isSaleMethod,
  priceBasket,
} from "@/lib/marathon/catalog";
import { getActiveVolunteer } from "@/lib/marathon/volunteers";
import { generateOrderId } from "@/lib/payments/order-id";
import { bookSaleStatusPath, orderToken } from "@/lib/payments/order-link";
import { gatewayConfig, paymentMode } from "@/lib/payments/gateways";
import { createQrCode } from "@/lib/payments/razorpay";
import { check, clientKey } from "@/lib/rate-limit";
import BookSale from "@/models/BookSale";

/**
 * A volunteer recording that books have changed hands.
 *
 * The one write in the whole marathon that is made by somebody standing
 * outside with a phone, so two things govern its design.
 *
 * First, the row is created before the money is, exactly as a donation's is.
 * Cash is the simple case — there is no gateway and the row is written
 * straight to "success" with `provider: "cash"`, because the cash is already
 * in the volunteer's hand and the only thing left to settle is where it
 * physically goes (see `CashSettlement`). Online is the familiar case: the row
 * exists first, so a payment that lands after the screen is locked has
 * something to be recorded against.
 *
 * Second, **nothing in the request decides what is charged**. The browser
 * sends titles and quantities; the price of each title comes from
 * `lib/marathon/books.js` on this side of the wire, and `priceBasket` does the
 * arithmetic that the stored row then holds. A volunteer cannot record a ₹300
 * Gita as a ₹30 one, which matters because they are the one who will be asked
 * for the difference at the end of the day.
 */

const bodySchema = z.object({
  lines: z
    .array(
      z.object({
        bookKey: z.string().trim().min(1).max(40),
        quantity: z.coerce.number().int().min(1).max(MAX_PER_TITLE),
      }),
    )
    .min(1)
    .max(10),
  method: z.string().refine(isSaleMethod),
  /* Both optional, and asked for last on the screen. Somebody buying a book on
     a footpath owes us no details. */
  buyerName: z.string().trim().max(80).optional().default(""),
  buyerPhone: z
    .string()
    .trim()
    .transform((value) => (value ? normalizePhone(value) : ""))
    .refine((value) => value === "" || PHONE_PATTERN.test(value))
    .optional()
    .default(""),
  note: z.string().trim().max(200).optional().default(""),
  locale: z.enum(["hi", "en"]).default("hi"),
});

function fail(status, error, headers) {
  return NextResponse.json({ ok: false, error }, { status, headers });
}

/**
 * A QR for this sale, or null when there is none to be had.
 *
 * Null is an ordinary outcome, not an error: the QR Codes API is enabled per
 * Razorpay account, and on an account without it every call here fails. A
 * volunteer must not lose a sale to that, so the failure is logged and the
 * screen falls back to the ordinary checkout — which takes UPI too, just on
 * whichever phone is holding it.
 */
async function qrFor(sale, { lang }) {
  const config = gatewayConfig("razorpay");
  if (!config) return null;

  try {
    const qr = await createQrCode(
      {
        orderId: sale.orderId,
        amount: sale.amount,
        kind: "book",
        description: `Gita Marathon - ${sale.quantity} ${
          sale.quantity === 1 ? "book" : "books"
        }`,
        notes: { volunteer: String(sale.volunteerClerkId).slice(0, 100) },
      },
      { lang, config },
    );

    return {
      id: qr.id,
      imageUrl: qr.image_url,
      closeBy: qr.close_by ? new Date(qr.close_by * 1000) : null,
    };
  } catch (error) {
    console.error(`[marathon] no QR for ${sale.orderId}`, error);
    return null;
  }
}

export async function POST(request) {
  /* Generous: a volunteer at a busy stall on a Sunday evening genuinely
     records a sale every twenty seconds, and throttling them is throttling
     book distribution. It is still a ceiling — this endpoint writes rows that
     a leaderboard ranks people by. */
  const limit = check(clientKey(request, "marathon-sale"), {
    limit: 60,
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

  /* The coordinator's switch for closing the marathon — after the last day,
     or while the accounts are being settled. Checked before the volunteer's
     own status so that closing it closes it for everybody at once. */
  if (!(await getFlag("marathon.open", true))) return fail(403, "closed");

  const volunteer = await getActiveVolunteer();
  if (!volunteer) return fail(403, "not_active");

  /* Priced here, on the server, from the server's own price list. */
  const { items, quantity, amount } = priceBasket(data.lines);
  if (!items.length || quantity < 1 || amount < 1) return fail(400, "empty");

  try {
    await dbConnect();

    const orderId = await generateOrderId(BOOK_SALE_ORDER_PREFIX);
    const described = await describeItems(items);
    const isCash = data.method === "cash";

    const sale = await BookSale.create({
      orderId,
      volunteerClerkId: volunteer.clerkId,
      volunteerId: volunteer._id,
      volunteerName: volunteer.name,
      items: described,
      quantity,
      amount,
      currency: "INR",
      method: data.method,
      dayKey: istDayKey(),
      buyer: { name: data.buyerName, phone: data.buyerPhone },
      note: data.note,
      locale: data.locale,
      /* Cash is settled on arrival. There is no gateway to wait for, and
         leaving it "pending" would mean a volunteer's own screen disagreed
         with the money in their pocket all day. `paidAt` is now because now
         is when they were handed the notes. */
      ...(isCash
        ? {
            payment: {
              status: "success",
              provider: "cash",
              paymentMode: "Cash",
              paidAt: new Date(),
            },
          }
        : {}),
    });

    /* The signed token and the sale's own page, for either kind of sale. A
       cash sale needs them as much as an online one: the reader may want a
       receipt, and the volunteer hands them the link. */
    const [token, statusUrl] = await Promise.all([
      orderToken(orderId),
      bookSaleStatusPath(orderId, data.locale),
    ]);

    if (isCash) {
      return NextResponse.json(
        { ok: true, orderId, method: "cash", amount, quantity, token, statusUrl },
        { status: 201 },
      );
    }

    const qr = await qrFor(sale, { lang: data.locale });
    if (qr) {
      await BookSale.updateOne({ orderId }, { $set: { qr } });
    }

    return NextResponse.json(
      {
        ok: true,
        orderId,
        method: "online",
        token,
        statusUrl,
        amount,
        quantity,
        qr: qr
          ? { imageUrl: qr.imageUrl, closeBy: qr.closeBy?.toISOString() ?? null }
          : null,
        /* With no gateway configured at all (a dev machine) the screen offers
           the simulator the rest of the site uses rather than a dead QR. */
        next: paymentMode() ? "pay" : "status",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[marathon] could not record the sale", error);
    return fail(500, "generic");
  }
}
