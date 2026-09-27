/**
 * The email that carries the 80G receipt.
 *
 * Headed ISKCON Patna and not IYF, for the same reason the attached PDF is:
 * the trust receives the donation and files the Form 10BE, the youth wing only
 * collects it. A mail headed with the wing's name arriving with a receipt
 * headed with the trust's reads like two different bodies took the money. The
 * course enrolment mail is IYF's own and stays as it is.
 */

/** Everything interpolated here is user input or copy — escape all of it. */
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COPY = {
  en: {
    subject: (seva) => `Thank you for your ${seva}`,
    heading: "Your donation is received",
    greeting: (name) => `Hare Krishna ${name},`,
    body: "Your offering has reached the temple. The 80G receipt is attached to this email as a PDF, and can be downloaded again from the link below at any time.",
    orderId: "Receipt number",
    seva: "Seva",
    amount: "Amount donated",
    paidOn: "Date",
    method: "Paid by",
    receipt: "Download 80G receipt",
    status: "View this donation",
    eightyG:
      "This donation is eligible for deduction under Section 80G. Form No. 10BE, the certificate used to claim it, is issued by 31st May of the next financial year to the PAN and email on your receipt.",
    footer:
      "ISKCON Patna — International Society for Krishna Consciousness (ISKCON), Patna.",
  },
  hi: {
    subject: (seva) => `आपकी ${seva} के लिए धन्यवाद`,
    heading: "आपका दान प्राप्त हो गया",
    greeting: (name) => `हरे कृष्ण ${name},`,
    body: "आपकी भेंट मंदिर तक पहुँच गई है। 80G रसीद इस ईमेल के साथ PDF में संलग्न है, और नीचे दिए लिंक से कभी भी दोबारा डाउनलोड की जा सकती है।",
    orderId: "रसीद संख्या",
    seva: "सेवा",
    amount: "दान राशि",
    paidOn: "दिनांक",
    method: "भुगतान माध्यम",
    receipt: "80G रसीद डाउनलोड करें",
    status: "यह दान देखें",
    eightyG:
      "यह दान धारा 80G के अंतर्गत कटौती के योग्य है। कटौती का दावा करने के लिए फॉर्म सं. 10BE अगले वित्तीय वर्ष की 31 मई तक आपकी रसीद पर दर्ज PAN और ईमेल पर जारी किया जाता है।",
    footer: "इस्कॉन पटना — श्री श्री राधा बाँके बिहारी मंदिर, बुद्ध मार्ग, पटना।",
  },
};

export function renderDonationReceiptEmail({
  locale,
  name,
  orderId,
  sevaTitle,
  amount,
  paidOn,
  paymentMode,
  statusUrl,
  receiptUrl,
}) {
  const c = COPY[locale] || COPY.hi;

  const row = (label, value) =>
    value
      ? `<tr><td style="color:#F2A63B;padding:6px 16px 6px 0;font-size:14px;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 0;font-size:14px;">${esc(value)}</td></tr>`
      : "";

  const button = (href, label, bg, fg) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;margin:6px 8px 6px 0;">${esc(label)}</a>`;

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#100A06;color:#FBF4EA;padding:32px;">
      <div style="max-width:520px;margin:0 auto;">
        <p style="color:#F2A63B;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;">ISKCON Patna</p>
        <h1 style="color:#FBF4EA;font-size:24px;margin:0 0 20px;">${esc(c.heading)}</h1>
        <p style="margin:0 0 8px;">${esc(c.greeting(name))}</p>
        <p style="margin:0 0 16px;color:rgba(251,244,234,.8);">${esc(c.body)}</p>
        <table style="margin:0 0 24px;border-collapse:collapse;">
          ${row(c.orderId, orderId)}
          ${row(c.seva, sevaTitle)}
          ${row(c.amount, amount)}
          ${row(c.paidOn, paidOn)}
          ${row(c.method, paymentMode)}
        </table>
        <div style="margin-top:8px;">
          ${button(receiptUrl, c.receipt, "#F2A63B", "#100A06")}
          ${button(statusUrl, c.status, "rgba(255,255,255,.12)", "#FBF4EA")}
        </div>
        <p style="margin:24px 0 0;padding:14px 16px;border:1px solid rgba(242,166,59,.35);border-radius:12px;color:rgba(251,244,234,.75);font-size:13px;line-height:1.6;">${esc(c.eightyG)}</p>
        <p style="color:rgba(251,244,234,.55);font-size:12px;margin-top:28px;">${esc(c.footer)}</p>
      </div>
    </div>
  `;

  return { subject: c.subject(sevaTitle), html };
}
