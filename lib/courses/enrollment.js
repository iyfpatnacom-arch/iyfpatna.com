/*
 * Order IDs are not a course concept — donations are numbered the same way —
 * so the generator lives with the rest of the payment plumbing. Re-exported
 * here because the enrolment route has always imported it from this path.
 */
export { generateOrderId } from "@/lib/payments/order-id";
