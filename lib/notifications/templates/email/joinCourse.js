export function renderJoinCourseEmail({ name, title, duration, locale }) {
  const isHi = locale === "hi";
  const heading = isHi ? `${title.hi} में आपकी जगह पक्की है` : `You're confirmed for ${title.en}`;
  const greeting = isHi ? `नमस्ते ${name},` : `Hi ${name},`;
  const body = isHi
    ? "हमने आपका पंजीकरण सफलतापूर्वक दर्ज कर लिया है। नीचे विवरण दिए गए हैं:"
    : "We've saved your registration. Here are the details:";
  const durationLabel = isHi ? "अवधि" : "Duration";
  const footer = isHi
    ? "इस्कॉन यूथ फोरम पटना में आपका स्वागत है — बिना किसी ड्रेस कोड या शुल्क के।"
    : "Welcome to ISKCON Youth Forum Patna — no dress code, no fees.";

  const html = `
    <div style="font-family:sans-serif;background:#100A06;color:#FBF4EA;padding:32px;">
      <h1 style="color:#FBF4EA;font-size:22px;">${heading}</h1>
      <p>${greeting}</p>
      <p>${body}</p>
      <table style="margin:16px 0;">
        <tr><td style="color:#F2A63B;padding-right:12px;">${durationLabel}</td><td>${duration}</td></tr>
      </table>
      <p style="color:rgba(251,244,234,.6);font-size:13px;">${footer}</p>
    </div>
  `;

  return { subject: heading, html };
}
