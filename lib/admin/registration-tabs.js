import { courseSlugs, getCourse } from "@/lib/courses/catalog";
import { getFestival } from "@/lib/gita-event/catalog";

/** The key the Gita tab answers to, in one place rather than three strings. */
export const GITA_TAB = "gita";

/**
 * Every register the attendance tool can show, in the order the tabs appear.
 *
 * Built here rather than in either page so the two screens cannot disagree
 * about what exists: /admin/registrations renders the course tabs beside a Gita
 * one, /admin/registrations/gita renders the same row with a different tab lit,
 * and adding next year's festival or a second course changes one list.
 */
export function registrationTabs(locale) {
  const courses = courseSlugs().map((slug) => ({
    key: slug,
    label: getCourse(slug)?.title?.[locale] ?? slug,
    href: `/admin/registrations?course=${slug}`,
  }));

  const festival = getFestival();

  return [
    ...courses,
    {
      key: GITA_TAB,
      label: festival.title[locale] || festival.title.en,
      href: "/admin/registrations/gita",
    },
  ];
}
