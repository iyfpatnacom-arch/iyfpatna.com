/**
 * Stubbed WhatsApp channel — payload in, result out. When a real provider
 * (AiSensy/Gupshup/Twilio) is wired in, only this file changes.
 */
export async function sendWhatsapp(payload) {
  console.log(
    `[notifications:whatsapp] stub — would message ${payload.phone} about "${payload.item.title?.en}"`
  );
  return { logged: true };
}
