/**
 * Clerk user ids that are admins by name, on top of anyone whose
 * `publicMetadata.role` is "admin".
 *
 * The role still works and is still the way to add someone without a deploy.
 * This list is for the accounts that must never be locked out by a metadata
 * edit in the Clerk dashboard — the root account above all.
 *
 * Plain data with no server imports, so the header can read it too to decide
 * whether to offer the "Admin" menu item. That is a convenience, not access
 * control: a Clerk user id is not a secret, and every admin page, action and
 * route re-checks on the server through `getAdminUser`.
 */
export const ADMIN_USERS = {
  user_3JS1FKNNCZFUn09ulR3XBVvgGmt: "root",
  user_3JUI2TXlHrNYaqHP9g40JGtCFKn: "admin",
};

export function isAllowlistedAdmin(userId) {
  return Boolean(userId) && Object.hasOwn(ADMIN_USERS, userId);
}
