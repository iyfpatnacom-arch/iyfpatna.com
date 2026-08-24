// Single source of truth for the CloudFront-hosted b-roll used across the site.
// Keep the keys descriptive of the footage, not of the slot it currently fills —
// sections reference these by meaning so a clip can be re-cast without a rename.
const CDN = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P";

export const videos = {
  /** Abstract mind / brain "enlightenment" motion — the hero centrepiece. */
  enlightenment: `${CDN}/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4`,
  /** A student reading alone with a book. */
  studyingAlone: `${CDN}/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4`,
  /** Wide community/gathering footage. */
  gathering: `${CDN}/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4`,
  /** Slower, contemplative b-roll. */
  reflection: `${CDN}/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4`,
};
