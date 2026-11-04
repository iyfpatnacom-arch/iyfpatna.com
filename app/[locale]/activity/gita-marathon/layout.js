import { setRequestLocale } from "next-intl/server";
import { getVolunteerStanding } from "@/lib/marathon/volunteers";
import { MarathonTabs } from "@/components/marathon/MarathonTabs";

/**
 * The shell every marathon screen sits in.
 *
 * Its only job is to decide whether the console's tab bar is there, and that
 * is one question asked in one place: an active volunteer gets the tabs, and
 * everybody else — a visitor reading the recruitment page, somebody waiting on
 * a coordinator, somebody switched off — gets the page without them. Asking it
 * here rather than in each page means the four screens cannot disagree about
 * whether the person looking at them is a volunteer.
 *
 * `force-dynamic` because the answer is a database read keyed to a session.
 * The pages underneath each declare it too, which is not redundant: a layout's
 * dynamism does not make its children dynamic.
 */
export const dynamic = "force-dynamic";

export default async function MarathonLayout({ children, params }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const { state } = await getVolunteerStanding();

  return (
    <>
      {state === "active" && <MarathonTabs />}
      {children}
    </>
  );
}
