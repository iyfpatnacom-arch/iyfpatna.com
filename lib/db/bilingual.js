export function bilingualField({ required = true } = {}) {
  return {
    hi: { type: String, required, trim: true },
    en: { type: String, required, trim: true },
  };
}
