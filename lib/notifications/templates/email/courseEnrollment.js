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
    subject: (course) => `You're in — ${course} seat confirmed`,
    heading: "Your seat is confirmed",
    greeting: (name) => `Hare Krishna ${name},`,
    body: "Your payment was received and your seat is reserved. Here are your details:",
    orderId: "Order ID",
    course: "Course",
    amount: "Amount paid",
    attending: "Attending",
    when: "When",
    whatsapp: "Join the WhatsApp group",
    whatsappNote: "Session reminders, the venue pin and the Zoom link are shared there — please join now.",
    receipt: "Download receipt",
    status: "View your order",
    passTitle: "Your entry pass",
    passNote: "Show this QR code at the entrance — it is scanned to mark your attendance. Keep it to yourself; it works once per day.",
    footer: "ISKCON Youth Forum Patna — the youth wing of ISKCON Patna.",
  },
  hi: {
    subject: (course) => `आपकी सीट पक्की — ${course}`,
    heading: "आपकी सीट पक्की हो गई है",
    greeting: (name) => `हरे कृष्ण ${name},`,
    body: "आपका भुगतान मिल गया है और आपकी सीट आरक्षित है। आपका विवरण:",
    orderId: "ऑर्डर ID",
    course: "कोर्स",
    amount: "भुगतान राशि",
    attending: "कैसे जुड़ेंगे",
    when: "समय",
    whatsapp: "WhatsApp ग्रुप से जुड़ें",
    whatsappNote: "सत्र की याद, स्थान और Zoom लिंक वहीं साझा होते हैं — कृपया अभी जुड़ें।",
    receipt: "रसीद डाउनलोड करें",
    status: "अपना ऑर्डर देखें",
    passTitle: "आपका एंट्री पास",
    passNote: "प्रवेश द्वार पर यह QR कोड दिखाएँ — इसे स्कैन करके आपकी उपस्थिति दर्ज होती है। इसे किसी से साझा न करें; यह हर दिन एक बार ही चलता है।",
    footer: "इस्कॉन यूथ फोरम पटना — इस्कॉन पटना की युवा शाखा।",
  },
};

export function renderCourseEnrollmentEmail({
  locale,
  name,
  orderId,
  courseTitle,
  amount,
  modeLabel,
  batchLabel,
  statusUrl,
  receiptUrl,
  whatsappUrl,
  passImageUrl,
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
        <p style="color:#F2A63B;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;">IYF Patna</p>
        <h1 style="color:#FBF4EA;font-size:24px;margin:0 0 20px;">${esc(c.heading)}</h1>
        <p style="margin:0 0 8px;">${esc(c.greeting(name))}</p>
        <p style="margin:0 0 16px;color:rgba(251,244,234,.8);">${esc(c.body)}</p>
        <table style="margin:0 0 24px;border-collapse:collapse;">
          ${row(c.orderId, orderId)}
          ${row(c.course, courseTitle)}
          ${row(c.amount, amount)}
          ${row(c.attending, modeLabel)}
          ${row(c.when, batchLabel)}
        </table>
        ${whatsappUrl ? `<p style="margin:0 0 4px;color:rgba(251,244,234,.8);font-size:14px;">${esc(c.whatsappNote)}</p>${button(whatsappUrl, c.whatsapp, "#25D366", "#ffffff")}` : ""}
        ${passImageUrl ? `<div style="margin:24px 0;padding:20px;border:2px dashed rgba(242,166,59,.5);border-radius:16px;text-align:center;">
          <p style="margin:0 0 12px;font-weight:600;font-size:16px;">${esc(c.passTitle)}</p>
          <img src="${esc(passImageUrl)}" width="200" height="200" alt="${esc(c.passTitle)} ${esc(orderId)}" style="display:block;margin:0 auto;background:#ffffff;border-radius:8px;" />
          <p style="margin:10px 0 0;font-family:monospace;font-size:15px;font-weight:600;">${esc(orderId)}</p>
          <p style="margin:8px 0 0;color:rgba(251,244,234,.75);font-size:13px;">${esc(c.passNote)}</p>
        </div>` : ""}
        <div style="margin-top:8px;">
          ${button(receiptUrl, c.receipt, "#F2A63B", "#100A06")}
          ${button(statusUrl, c.status, "rgba(255,255,255,.12)", "#FBF4EA")}
        </div>
        <p style="color:rgba(251,244,234,.55);font-size:12px;margin-top:28px;">${esc(c.footer)}</p>
      </div>
    </div>
  `;

  return { subject: c.subject(courseTitle), html };
}
