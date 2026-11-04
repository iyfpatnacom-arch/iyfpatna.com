"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  BadgeCheck,
  BookOpen,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ShieldOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Panel } from "@/components/site/Panel";
import { setVolunteerStatus } from "@/app/[locale]/admin/gita-marathon/actions";
import { cn } from "@/lib/utils";

/**
 * The coordinator's list, grouped by what has to be decided about it.
 *
 * Everybody waiting comes first and is shown in full — the area they gave,
 * their college, and whatever they wrote about themselves — because activating
 * somebody means letting them draw stock from the temple and collect money in
 * its name, and that decision should be made from what they said rather than
 * from a name and a tick box.
 *
 * Switching somebody off asks for a reason, and the reason is shown to the
 * volunteer on their own screen. Being cut off with no explanation is how a
 * volunteer stops being a volunteer; there is no delete here at all, because
 * every sale and every cash settlement points back at these rows.
 */

const GROUPS = ["pending", "active", "suspended"];

const TONE = {
  pending: "border-primary/30 bg-primary/[0.04]",
  active: "border-border bg-card",
  suspended: "border-destructive/25 bg-destructive/[0.03]",
};

export function MarathonVolunteers({ groups }) {
  const t = useTranslations("admin");
  const locale = useLocale();

  const registered = new Intl.DateTimeFormat(
    locale === "hi" ? "hi-IN" : "en-IN",
    { day: "numeric", month: "short", timeZone: "Asia/Kolkata" },
  );

  const total = GROUPS.reduce(
    (count, key) => count + (groups[key]?.length ?? 0),
    0,
  );

  if (total === 0) {
    return (
      <Panel className="mt-8 p-10 text-center text-sm text-muted-foreground">
        {t("mar_vol_empty")}
      </Panel>
    );
  }

  return (
    <div className="mt-8 flex flex-col gap-10">
      {GROUPS.map((group) => {
        const rows = groups[group] ?? [];
        if (!rows.length) return null;

        return (
          <section key={group}>
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              {t(`mar_vol_${group}`)}
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                {rows.length}
              </span>
            </h2>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {rows.map((volunteer) => (
                <VolunteerCard
                  key={volunteer.clerkId}
                  volunteer={volunteer}
                  registered={registered}
                  t={t}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function VolunteerCard({ volunteer, registered, t }) {
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState(false);
  const [pending, startTransition] = useTransition();

  function change(status) {
    startTransition(async () => {
      const result = await setVolunteerStatus({
        clerkId: volunteer.clerkId,
        status,
        note: status === "suspended" ? note : "",
      });

      if (!result?.ok) {
        toast.error(t("mar_vol_failed"));
        return;
      }
      setAsking(false);
      setNote("");
      toast.success(
        status === "active"
          ? t("mar_vol_activated", { name: volunteer.name })
          : t("mar_vol_suspended_toast", { name: volunteer.name }),
      );
    });
  }

  const where = [volunteer.city, volunteer.college].filter(Boolean).join(" · ");

  return (
    <Panel className={cn("p-5", TONE[volunteer.status])}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold tracking-tight">
            {volunteer.name}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {t("mar_vol_registered", {
              when: registered.format(new Date(volunteer.createdAt)),
            })}
          </p>
        </div>
        {volunteer.books > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground tabular-nums">
            <BookOpen className="size-3" aria-hidden="true" />
            {t("mar_vol_books", {
              books: volunteer.books,
              amount: volunteer.amount,
            })}
          </span>
        )}
      </div>

      <ul className="mt-4 flex flex-col gap-1.5 text-sm text-muted-foreground">
        <li className="flex items-center gap-2">
          <Phone className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
          {/* A coordinator reads this list in order to ring somebody, so the
              number is a link rather than text to copy out by hand. */}
          <a
            href={`tel:+91${volunteer.phone}`}
            className="transition-colors hover:text-foreground"
          >
            +91 {volunteer.phone}
          </a>
        </li>
        {volunteer.email && (
          <li className="flex min-w-0 items-center gap-2">
            <Mail className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
            <a
              href={`mailto:${volunteer.email}`}
              className="truncate transition-colors hover:text-foreground"
            >
              {volunteer.email}
            </a>
          </li>
        )}
        {where && (
          <li className="flex items-start gap-2">
            <MapPin
              className="mt-0.5 size-3.5 shrink-0 opacity-70"
              aria-hidden="true"
            />
            <span className="min-w-0">{where}</span>
          </li>
        )}
        <li className="text-xs">
          {t(`mar_vol_occupation_${volunteer.occupation}`)}
          {volunteer.age ? ` · ${t("mar_vol_age", { age: volunteer.age })}` : ""}
        </li>
      </ul>

      {volunteer.about && (
        <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
          {volunteer.about}
        </p>
      )}

      {volunteer.decisionNote && volunteer.status === "suspended" && (
        <p className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-xs leading-relaxed text-destructive">
          {volunteer.decisionNote}
        </p>
      )}

      {/* ----------------------------------------------------- the decision */}
      {asking ? (
        <div className="mt-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              {t("mar_vol_note")}
            </span>
            <Input
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 200))}
              placeholder={t("mar_vol_note_placeholder")}
              className="h-10"
            />
          </label>
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={() => setAsking(false)}
            >
              {t("mar_cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending}
              className="flex-1 rounded-full"
              onClick={() => change("suspended")}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldOff className="size-4" aria-hidden="true" />
              )}
              {t("mar_vol_suspend")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex flex-wrap gap-2">
          {volunteer.status !== "active" && (
            <Button
              disabled={pending}
              className="rounded-full"
              onClick={() => change("active")}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <BadgeCheck className="size-4" aria-hidden="true" />
              )}
              {volunteer.status === "suspended"
                ? t("mar_vol_reactivate")
                : t("mar_vol_activate")}
            </Button>
          )}
          {volunteer.status === "active" && (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setAsking(true)}
            >
              <ShieldOff className="size-4" aria-hidden="true" />
              {t("mar_vol_suspend")}
            </Button>
          )}
        </div>
      )}
    </Panel>
  );
}
