import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  /* The policy documents are long enough that keeping them in the main
     catalogue would bury every other string, so they live in their own file
     per locale and are grafted on as the `legal` namespace. Consumers still
     read one messages object. */
  const [common, legal] = await Promise.all([
    import(`../messages/${locale}.json`),
    import(`../messages/legal.${locale}.json`),
  ]);

  return {
    locale,
    messages: { ...common.default, legal: legal.default },
  };
});
