import discoverYourself from "@/content/courses/discover-yourself.json";

/**
 * Paid courses that have their own landing page and checkout.
 *
 * Each course is one JSON file in content/courses — the copy in both
 * languages, the batch, and the price. The price lives there rather than in an
 * environment variable on purpose:
 *
 *   - It is product data, not configuration. It changes with a batch or an
 *     offer, not with the machine the site runs on, and git keeps a history of
 *     every price the course has ever been sold at.
 *   - The landing page and the payment route read the *same* value. An env
 *     var would have to be NEXT_PUBLIC_ to reach the page and would then be
 *     inlined at build time, which is exactly how a page ends up showing one
 *     number while the gateway charges another.
 *   - It sits beside the MRP, the seat cap and the dates it belongs to.
 *
 * The server never trusts a price from the browser: the enrolment route reads
 * it from here and stores it on the row, and the gateway is charged from the
 * row.
 *
 * Adding a course: drop another JSON file in content/courses, import it below,
 * and give its Course row in the database the same `slug`.
 */
const COURSES = [discoverYourself];

export function getCourse(slug) {
  return COURSES.find((course) => course.slug === slug) ?? null;
}

export function courseSlugs() {
  return COURSES.map((course) => course.slug);
}

/**
 * Which landing page a Course row belongs to, if any.
 *
 * Matched by `slug` first. Rows seeded before slugs existed are matched by
 * their English title, so the Join button works against an existing database
 * without waiting for a re-seed.
 */
export function landingSlugFor(item) {
  if (!item) return null;
  if (item.slug && getCourse(item.slug)) return item.slug;
  const title = String(item.title?.en || "").trim().toLowerCase();
  return COURSES.find((course) => course.matchTitles?.includes(title))?.slug ?? null;
}

export function pricingOf(course) {
  const amount = Number(course.pricing.amount);
  const mrp = Number(course.pricing.mrp) || null;
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Course "${course.slug}" has no valid price.`);
  }
  return {
    amount,
    mrp: mrp && mrp > amount ? mrp : null,
    currency: course.pricing.currency || "INR",
    discountPercent: mrp && mrp > amount ? Math.round((1 - amount / mrp) * 100) : 0,
  };
}

export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** The extra fields a course card needs to link to its landing page. */
export function courseCardExtras(item) {
  const slug = landingSlugFor(item);
  if (!slug) return {};
  return {
    href: `/courses/${slug}`,
    priceLabel: formatINR(pricingOf(getCourse(slug)).amount),
  };
}

export function isEnrollmentOpen(course) {
  return course.batch?.registrationOpen !== false;
}

export function modeOf(course, key) {
  return course.modes?.find((mode) => mode.key === key) ?? null;
}

/** "30–31 May · 4 PM onwards", or null when the batch has no dates yet. */
export function batchDateLabel(course, locale) {
  return course.batch?.dateLabel?.[locale] || null;
}

/**
 * The WhatsApp group a paid participant is sent to.
 *
 * The course's own group when it has one; otherwise the community group the
 * rest of the site already links to, so a confirmed seat is never left
 * without somewhere to go.
 */
export async function whatsappGroupFor(course) {
  if (course?.whatsappGroupUrl) return course.whatsappGroupUrl;
  const { getWhatsappGroupUrl } = await import("@/lib/settings");
  return getWhatsappGroupUrl();
}
