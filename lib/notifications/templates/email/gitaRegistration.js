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
    subject: (title) => `You're registered — ${title}`,
    heading: "Your registration is confirmed",
    greeting: (name) => `Hare Krishna ${name},`,
    body: "Your payment was received and your place is confirmed. Here are your details:",
    orderId: "Order ID",
    registeredFor: "Registered for",
    amount: "Amount paid",
    referral: "Referred by",
    groupsTitle: "Join the WhatsApp group",
    groupsNote:
      "This is where the quiz link, the timings and every announcement go out. Please join now — a registration with no group is a missed link.",
    receipt: "Download receipt",
    status: "View your registration",
    passTitle: "Your entry pass",
    passNote:
      "Show this QR code at the entrance. It is scanned once per event to mark your attendance. Keep it to yourself.",
    helpline: (phone) => `Questions? Call ${phone}.`,
    footer: "ISKCON Youth Forum Patna — the youth wing of ISKCON Patna.",
  },
  hi: {
    subject: (title) => `आपका रजिस्ट्रेशन पक्का — ${title}`,
    heading: "आपका रजिस्ट्रेशन पक्का हो गया है",
    greeting: (name) => `हरे कृष्ण ${name},`,
    body: "आपका भुगतान मिल गया है और आपका स्थान सुरक्षित है। आपका विवरण:",
    orderId: "ऑर्डर ID",
    registeredFor: "किसके लिए",
    amount: "भुगतान राशि",
    referral: "किसने बताया",
    groupsTitle: "WhatsApp ग्रुप से जुड़ें",
    groupsNote:
      "क्विज़ का लिंक, समय और हर सूचना वहीं भेजी जाती है। कृपया अभी जुड़ें — ग्रुप के बिना रजिस्ट्रेशन का मतलब छूटा हुआ लिंक है।",
    receipt: "रसीद डाउनलोड करें",
    status: "अपना रजिस्ट्रेशन देखें",
    passTitle: "आपका एंट्री पास",
    passNote:
      "प्रवेश द्वार पर यह QR कोड दिखाएँ। हर कार्यक्रम में एक बार स्कैन होकर आपकी उपस्थिति दर्ज होती है। इसे किसी से साझा न करें।",
    helpline: (phone) => `कोई प्रश्न? ${phone} पर कॉल करें।`,
    footer: "इस्कॉन यूथ फोरम पटना — इस्कॉन पटना की युवा शाखा।",
  },
};

/**
 * The "you're registered" email for the Gita festival.
 *
 * Its own template rather than the course one with a longer subject, because
 * the thing it has to carry is a *list*: one person may hold two events and two
 * WhatsApp groups, each with its own date, and the group buttons are the most
 * important pixels in the message — the quiz link only ever goes out there.
 *
 * Inline styles and a table layout throughout: this is email, where a
 * stylesheet is stripped and flexbox is a coin toss.
 */
export function renderGitaRegistrationEmail({
  locale,
  name,
  orderId,
  festivalTitle,
  events,
  amount,
  referral,
  statusUrl,
  receiptUrl,
  groups,
  passImageUrl,
  helpline,
}) {
  const c = COPY[locale] || COPY.hi;

  const row = (label, value) =>
    value
      ? `<tr><td style="color:#F2A63B;padding:6px 16px 6px 0;font-size:14px;white-space:nowrap;vertical-align:top;">${esc(label)}</td><td style="padding:6px 0;font-size:14px;">${esc(value)}</td></tr>`
      : "";

  const button = (href, label, bg, fg) =>
    `<a href="${esc(href)}" style="display:inline-block;background:${bg};color:${fg};text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px;margin:6px 8px 6px 0;">${esc(label)}</a>`;

  const eventList = (events || [])
    .map(
      (event) =>
        `<li style="margin:0 0 6px;">${esc(event.title)}${
          event.dateLabel ? ` <span style="color:rgba(251,244,234,.6);">— ${esc(event.dateLabel)}</span>` : ""
        }</li>`,
    )
    .join("");

  const groupButtons = (groups || [])
    .map((group) => button(group.url, `${c.groupsTitle} · ${group.title}`, "#25D366", "#ffffff"))
    .join("");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#100A06;color:#FBF4EA;padding:32px;">
      <div style="max-width:520px;margin:0 auto;">
        <p style="color:#F2A63B;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 8px;">IYF Patna</p>
        <h1 style="color:#FBF4EA;font-size:24px;margin:0 0 20px;">${esc(c.heading)}</h1>
        <p style="margin:0 0 8px;">${esc(c.greeting(name))}</p>
        <p style="margin:0 0 16px;color:rgba(251,244,234,.8);">${esc(c.body)}</p>
        <table style="margin:0 0 16px;border-collapse:collapse;">
          ${row(c.orderId, orderId)}
          ${row(c.amount, amount)}
          ${row(c.referral, referral)}
        </table>
        <p style="color:#F2A63B;font-size:12px;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px;">${esc(c.registeredFor)}</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;">${eventList}</ul>
        ${groupButtons ? `<p style="margin:0 0 4px;color:rgba(251,244,234,.8);font-size:14px;">${esc(c.groupsNote)}</p>${groupButtons}` : ""}
        ${
          passImageUrl
            ? `<div style="margin:24px 0;padding:20px;border:2px dashed rgba(242,166,59,.5);border-radius:16px;text-align:center;">
          <p style="margin:0 0 12px;font-weight:600;font-size:16px;">${esc(c.passTitle)}</p>
          <img src="${esc(passImageUrl)}" width="200" height="200" alt="${esc(c.passTitle)} ${esc(orderId)}" style="display:block;margin:0 auto;background:#ffffff;border-radius:8px;" />
          <p style="margin:10px 0 0;font-family:monospace;font-size:15px;font-weight:600;">${esc(orderId)}</p>
          <p style="margin:8px 0 0;color:rgba(251,244,234,.75);font-size:13px;">${esc(c.passNote)}</p>
        </div>`
            : ""
        }
        <div style="margin-top:8px;">
          ${button(receiptUrl, c.receipt, "#F2A63B", "#100A06")}
          ${button(statusUrl, c.status, "rgba(255,255,255,.12)", "#FBF4EA")}
        </div>
        ${helpline ? `<p style="color:rgba(251,244,234,.7);font-size:13px;margin-top:24px;">${esc(c.helpline(helpline))}</p>` : ""}
        <p style="color:rgba(251,244,234,.55);font-size:12px;margin-top:20px;">${esc(c.footer)}</p>
      </div>
    </div>
  `;

  return { subject: c.subject(festivalTitle), html };
}
