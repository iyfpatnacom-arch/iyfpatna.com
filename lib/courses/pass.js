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
