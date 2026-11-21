import QRCode from "qrcode";
import { absoluteUrl, passPath } from "@/lib/payments/order-link";

/**
 * The entry pass — a QR code a paid participant shows at the door.
 *
 * The QR is nothing but a signed link to the admin "admit" page, so any phone
 * camera can read it and no app is needed at the gate. Drawn in three shapes
 * for three places: SVG for the order page, PNG for the email and the receipt
 * PDF. Always black on white with a quiet zone, whatever the page theme —
 * a scanner needs contrast far more than the pass needs to match.
 *
 * It lives beside the signing code rather than under `lib/courses`, where it
 * started, because it is a function of the order ID and nothing else: a course
 * seat and a Gita festival registration are handed the same kind of pass, read
 * by the same camera, and admitted through the same page. Nothing in here knows
 * or needs to know which collection the order came from.
 */

const OPTIONS = {
  margin: 2,
  errorCorrectionLevel: "M",
  color: { dark: "#000000", light: "#ffffff" },
};

export async function passUrl(orderId) {
  return absoluteUrl(await passPath(orderId));
}

export async function passQrSvg(orderId) {
  return QRCode.toString(await passUrl(orderId), { ...OPTIONS, type: "svg" });
}

export async function passQrPng(orderId, width = 480) {
  return QRCode.toBuffer(await passUrl(orderId), { ...OPTIONS, type: "png", width });
}
