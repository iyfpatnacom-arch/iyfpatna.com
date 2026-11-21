"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-config";
import { dbConnect } from "@/lib/db/connect";
import { toPlain } from "@/lib/serialize";
import { getBook } from "@/lib/marathon/catalog";
import BookSale from "@/models/BookSale";
import CashSettlement from "@/models/CashSettlement";
import MarathonVolunteer from "@/models/MarathonVolunteer";

/**
 * The decisions only a coordinator makes: who may sell, what they are given
 * to sell, how much cash actually arrived, and which transfers really
 * landed.
 *
 * Both are the kind of write that wants an audit trail rather than a clean
 * final state, and both are written accordingly — see the notes on each.
 *
 * `requireAdmin` throws rather than returning, because a server action has no
 * UI to fall back to and must simply refuse. Expected mistakes come back as
 * `{ ok: false, error }` with a message key, as the other admin actions do.
 */

const PATHS = [
  "/[locale]/admin/gita-marathon",
  "/[locale]/admin/gita-marathon/volunteers",
  "/[locale]/admin/gita-marathon/cash",
  /* The volunteer's own screens, so somebody watching their phone while the
     coordinator activates them sees it happen. */
  "/[locale]/activity/gita-marathon",
];

function revalidateAll() {
  for (const path of PATHS) revalidatePath(path, "page");
}

const statusSchema = z.object({
  clerkId: z.string().trim().min(1).max(100),
  status: z.enum(["pending", "active", "suspended"]),
  note: z.string().trim().max(200).default(""),
});

/**
 * Letting somebody sell, or stopping them.
 *
 * The one write in this feature with real consequences outside the database:
 * an active volunteer can draw stock from the temple and collect money in its
 * name. So the row records *who* decided and *when*, and a suspension carries
 * a reason that the volunteer themselves is shown — being switched off without
 * explanation is how a volunteer stops being a volunteer.
 *
 * Deliberately no delete. Every sale and every cash settlement points back at
 * this row, and removing a volunteer would orphan a day's accounts; suspension
 * is the off switch, and it keeps the history.
 */
export async function setVolunteerStatus(input) {
  const adminId = await requireAdmin();

  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "mar_vol_failed" };
  const { clerkId, status, note } = parsed.data;

  await dbConnect();

  const volunteer = await MarathonVolunteer.findOneAndUpdate(
    { clerkId },
    {
      $set: {
        status,
        decidedBy: adminId,
        decidedAt: new Date(),
        /* Kept when nothing new is given, so re-activating somebody does not
           erase the note explaining why they were switched off. */
        ...(note ? { decisionNote: note } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!volunteer) return { ok: false, error: "mar_vol_failed" };

  revalidateAll();
  return { ok: true, volunteer: toPlain(volunteer) };
}

const verifySchema = z.object({
  id: z.string().trim().min(1).max(60),
  receivedAmount: z.coerce
    .number()
    .int("mar_cash_err_amount")
    .min(0, "mar_cash_err_amount")
    .max(1000000, "mar_cash_err_amount"),
  adminNote: z.string().trim().max(300).default(""),
});

/**
 * Counting a volunteer's cash and closing the day.
 *
 * `variance` is stored as `received - expected` rather than the expected
 * figure being adjusted to match. That is the whole discipline of this
 * function: a deficit is a fact about a day and about a person, and quietly
 * editing the expectation so the books balance is how a shortfall stops being
 * visible to the next person who looks. Positive is excess, negative is short,
 * and `adminOverview` sums them across every counted day so the running total
 * is the figure the temple actually watches.
 *
 * Scoped to `status: "submitted"`, so counting the same handover twice is a
 * no-op rather than a second write — two people at the desk with the same
 * list open is the ordinary case, not the exception.
 */
export async function verifyCashSettlement(input) {
  const adminId = await requireAdmin();

  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || "mar_cash_err_amount",
    };
  }
  const { id, receivedAmount, adminNote } = parsed.data;

  await dbConnect();

  const existing = await CashSettlement.findOne({
    _id: id,
    status: "submitted",
  }).lean();
  if (!existing) return { ok: false, error: "mar_cash_err_not_found" };

  const settlement = await CashSettlement.findOneAndUpdate(
    { _id: id, status: "submitted" },
    {
      $set: {
        status: "verified",
        receivedAmount,
        variance: receivedAmount - existing.expectedAmount,
        verifiedBy: adminId,
        verifiedAt: new Date(),
        ...(adminNote ? { adminNote } : {}),
      },
    },
    { returnDocument: "after" },
  ).lean();

  if (!settlement) return { ok: false, error: "mar_cash_err_not_found" };

  revalidateAll();
  return { ok: true, settlement: toPlain(settlement) };
}

/* A typed-in title becomes "custom:krishna-book". Slugged rather than given a
   random id, so issuing the same title to the same volunteer twice adds to
   the pile instead of creating a second line of it. */
function customKey(name) {
  const slug = String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug ? `custom:${slug}` : "";
}

const issueSchema = z.object({
  clerkId: z.string().trim().min(1).max(100),
  note: z.string().trim().max(200).default(""),
  lines: z
    .array(
      z.object({
        /* Either a catalogue key, or blank with a name typed beside it. */
        bookKey: z.string().trim().max(60).default(""),
        name: z.string().trim().max(80).default(""),
        price: z.coerce.number().int().min(0).max(100000).optional(),
        /* Negative takes stock back, which is the other half of a trolley: a
           volunteer who hands twelve unsold copies in at the end of the week
           should not look like somebody who lost twelve copies. */
        quantity: z.coerce.number().int().min(-500).max(500),
      }),
    )
    .min(1)
    .max(20),
});

/**
 * Handing a volunteer their books — and taking the unsold ones back.
 *
 * The trolley is the price list: a sale is priced from these rows and not
 * from the catalogue, which is what lets a coordinator issue a title the site
 * has never heard of by typing its name and its price. A catalogue title
 * keeps its translated name so the receipt reads correctly in both languages;
 * a typed one carries the same text in both, because that is all there is.
 *
 * Written as a read, a merge and one save rather than as an array of `$inc`s:
 * a consignment may add a line that is not there yet and increment one that
 * is, and expressing that as a positional update is a far harder thing to
 * read than recomputing twenty numbers.
 *
 * `issued` only ever grows, and a return raises `returned` instead of
 * lowering it. What is left is `issued - returned - sold`, counted from the
 * sales themselves; keeping the two halves apart is what makes "they were
 * given 60 and brought 12 back" answerable in January, which a stored 48
 * would not be.
 */
export async function issueVolunteerStock(input) {
  const adminId = await requireAdmin();

  const parsed = issueSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "mar_stock_failed" };
  const { clerkId, lines, note } = parsed.data;

  await dbConnect();

  const volunteer = await MarathonVolunteer.findOne({ clerkId });
  if (!volunteer) return { ok: false, error: "mar_stock_failed" };

  const stock = (volunteer.stock || []).map((item) => ({
    bookKey: item.bookKey,
    title: { hi: item.title?.hi || "", en: item.title?.en || "" },
    language: item.language || "hi",
    unitPrice: Number(item.unitPrice) || 0,
    issued: Number(item.issued) || 0,
    returned: Number(item.returned) || 0,
    custom: Boolean(item.custom),
  }));

  const logged = [];

  for (const line of lines) {
    if (!line.quantity) continue;

    const catalogue = line.bookKey ? getBook(line.bookKey) : null;
    const key = catalogue ? catalogue.key : customKey(line.name);
    if (!key) continue;

    let entry = stock.find((item) => item.bookKey === key);

    if (!entry) {
      /* Nothing to take back from a title they were never given. */
      if (line.quantity < 0) continue;

      const name = catalogue ? "" : line.name.trim();
      if (!catalogue && !name) continue;

      entry = {
        bookKey: key,
        /* A catalogue title's name is filled in from the message bundle at
           sale time; a typed one has only what was typed. */
        title: catalogue ? { hi: "", en: "" } : { hi: name, en: name },
        language: catalogue?.language || "hi",
        unitPrice: catalogue ? catalogue.price : Number(line.price) || 0,
        issued: 0,
        returned: 0,
        custom: !catalogue,
      };
      stock.push(entry);
    }

    /* A re-issue of a typed-in title may also re-price it: these are the
       prices a coordinator set by hand, and the trolley is what the next sale
       is priced from. Catalogue titles keep the catalogue's price, and only a
       positive line can change anything — taking stock back is not a price
       change. */
    if (line.quantity > 0 && line.price !== undefined && !catalogue) {
      entry.unitPrice = Number(line.price) || 0;
    }

    if (line.quantity > 0) {
      entry.issued += line.quantity;
    } else {
      /* Never take back more than is out: a return that exceeded the issue
         would make what is left negative and the cap meaningless. */
      const outstanding = Math.max(0, entry.issued - entry.returned);
      entry.returned += Math.min(-line.quantity, outstanding);
    }

    logged.push({
      bookKey: key,
      title: entry.title.en || entry.title.hi || key,
      unitPrice: entry.unitPrice,
      quantity: line.quantity,
    });
  }

  if (!logged.length) return { ok: false, error: "mar_stock_empty" };

  volunteer.stock = stock;
  volunteer.consignments.push({ at: new Date(), by: adminId, lines: logged, note });
  await volunteer.save();

  revalidateAll();
  /* The volunteer's own console is capped by this, so it has to re-render. */
  revalidatePath("/[locale]/activity/gita-marathon/sell", "page");

  return { ok: true, stock: toPlain(volunteer.stock) };
}

const matchSchema = z.object({
  orderId: z.string().trim().min(1).max(40),
});

/**
 * Ticking off a UPI transfer against the bank statement.
 *
 * The counterpart of counting a volunteer's cash, for money that never passed
 * through anybody's pocket. A sale paid into the fixed QR closes on the
 * volunteer's word plus four digits of a UTR; this is the second person
 * confirming those four digits appear on the statement. Until then the
 * admin's list shows it as unmatched, which is the only signal the temple
 * gets that a claimed transfer never arrived.
 *
 * Scoped to a claim nobody has matched yet, so two coordinators working the
 * same list do not overwrite each other's name on it.
 */
export async function matchUpiClaim(input) {
  const adminId = await requireAdmin();

  const parsed = matchSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "mar_claim_failed" };

  await dbConnect();

  const sale = await BookSale.findOneAndUpdate(
    { orderId: parsed.data.orderId, method: "online", "claim.verifiedAt": null },
    { $set: { "claim.verifiedBy": adminId, "claim.verifiedAt": new Date() } },
    { returnDocument: "after" },
  ).lean();

  if (!sale) return { ok: false, error: "mar_claim_failed" };

  revalidateAll();
  return { ok: true, orderId: sale.orderId };
}
