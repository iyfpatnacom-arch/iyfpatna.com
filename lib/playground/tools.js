/**
 * The seven tools, in one list.
 *
 * The playground index, the "more tools" strip at the foot of each tool and
 * anything else that needs to name them all read this instead of keeping their
 * own copy — a tool that has been built but is missing from one of those lists
 * is a tool nobody finds.
 *
 * Deliberately free of any database read. The previous index queried four
 * feature flags on every request and went down with Mongo, taking the dock's
 * Playground tab with it; these tools have nothing to gate, because every one
 * of them works offline and signed out. `signInAdds` is the honest version of
 * that promise: what an account buys, which is never access, only sync.
 *
 * `icon` is a lucide-react export name. The consumer maps it, so this module
 * stays importable from a server component without pulling the icon set in.
 */

export const TOOLS = [
  {
    key: "sadhana",
    href: "/playground/sadhana-card",
    icon: "ListChecks",
    accent: "gold",
    signInAdds: "sync",
  },
  {
    key: "japa",
    href: "/playground/japa-counter",
    icon: "CircleDot",
    accent: "gold",
    signInAdds: "sync",
  },
  {
    key: "gita_daily",
    href: "/playground/gita-daily",
    icon: "Puzzle",
    accent: "purple",
    signInAdds: "sync",
  },
  {
    key: "feelings",
    href: "/playground/gita-feelings",
    icon: "HeartHandshake",
    accent: "purple",
    signInAdds: null,
  },
  {
    key: "kirtan",
    href: "/playground/kirtan-library",
    icon: "Music",
    accent: "gold",
    signInAdds: null,
  },
  {
    key: "calendar",
    href: "/playground/vaishnava-calendar",
    icon: "MoonStar",
    accent: "purple",
    signInAdds: null,
  },
  {
    key: "checkin",
    href: "/playground/check-in",
    icon: "QrCode",
    accent: "gold",
    signInAdds: "identity",
  },
];

export function toolByKey(key) {
  return TOOLS.find((tool) => tool.key === key) ?? null;
}

/** Every tool except the one being viewed — for the strip at the foot of a page. */
export function otherTools(currentKey) {
  return TOOLS.filter((tool) => tool.key !== currentKey);
}
