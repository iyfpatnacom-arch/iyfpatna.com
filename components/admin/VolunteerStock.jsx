"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { BookPlus, LoaderCircle, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GITA_BOOKS } from "@/lib/marathon/books";
import { issueVolunteerStock } from "@/app/[locale]/admin/gita-marathon/actions";
import { cn } from "@/lib/utils";

/**
 * The trolley, on the coordinator's card: what this volunteer is holding, and
 * the form that changes it.
 *
 * Issuing books is the act that actually lets somebody sell. Activating them
 * only opens the door — a volunteer with an active account and an empty
 * trolley sees a console with nothing in it, which is deliberate: the two are
 * separate decisions and the second one is the one where stock leaves the
 * building.
 *
 * Two ways to add to it, because the temple has two kinds of title. The
 * catalogue rows are the ones the site knows, at the site's prices, named in
 * both languages. The free rows are everything else — a Bhagavatam canto, a
 * box of last year's Krishna Book, a Hindi Gita at a festival price — and
 * they are typed in with a name, a price and a count. Both end up as the
 * same thing on the volunteer's trolley, and a sale is priced from that
 * rather than from the catalogue.
 *
 * Quantities go negative to take stock back, and the form says so rather than
 * hiding it behind a second button: at the end of a week a coordinator is
 * more often counting unsold copies in than handing new ones out, and a
 * volunteer who returns twelve must not read as a volunteer who lost twelve.
 */
export function VolunteerStock({ volunteer, t }) {
  const locale = useLocale();
  const tm = useTranslations("marathon");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  /* Catalogue rows are keyed by book; free rows are a list the coordinator
     grows. Kept apart because they validate differently — a catalogue row
     needs only a number, a free row needs a name and a price too. */
  const [counts, setCounts] = useState({});
  const [extras, setExtras] = useState([]);
  const [note, setNote] = useState("");

  const stock = volunteer.stock ?? [];
  const held = stock.reduce((total, item) => total + item.remaining, 0);

  function reset() {
    setCounts({});
    setExtras([]);
    setNote("");
    setOpen(false);
  }

  function submit() {
    const lines = [
      ...Object.entries(counts)
        .filter(([, quantity]) => Number(quantity))
        .map(([bookKey, quantity]) => ({ bookKey, quantity: Number(quantity) })),
      ...extras
        .filter((row) => row.name.trim() && Number(row.quantity))
        .map((row) => ({
          name: row.name.trim(),
          price: Number(row.price) || 0,
          quantity: Number(row.quantity),
        })),
    ];

    if (!lines.length) {
      toast.error(t("mar_stock_empty"));
      return;
    }

    startTransition(async () => {
      const result = await issueVolunteerStock({
        clerkId: volunteer.clerkId,
        lines,
        note,
      });
      if (!result?.ok) {
        toast.error(t(result?.error || "mar_stock_failed"));
        return;
      }
      reset();
      toast.success(t("mar_stock_issued", { name: volunteer.name }));
    });
  }

  /** A catalogue title's name, or the coordinator's own words for a free one. */
  const nameOf = (item) => {
    const snapshot = locale === "hi" ? item.title?.hi : item.title?.en;
    if (snapshot) return snapshot;
    try {
      return tm(`books.${item.bookKey}.name`);
    } catch {
      return item.bookKey;
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-border/70 bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t("mar_stock_title")}
        </p>
        <span className="text-xs font-medium tabular-nums">
          {t("mar_stock_held", { books: held })}
        </span>
      </div>

      {stock.length > 0 ? (
        <ul className="mt-2.5 flex flex-col gap-1">
          {stock.map((item) => (
            <li
              key={item.bookKey}
              className="flex items-baseline justify-between gap-3 text-sm"
            >
              <span className="min-w-0 truncate">
                {nameOf(item)}
                <span className="ms-1.5 text-xs text-muted-foreground tabular-nums">
                  ₹{item.unitPrice}
                </span>
              </span>
              {/* Issued, sold and left — all three, because "12 left" alone
                  cannot tell a slow week from a small consignment. */}
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {t("mar_stock_line", {
                  issued: item.issued,
                  sold: item.sold,
                  left: item.remaining,
                })}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {t("mar_stock_none")}
        </p>
      )}

      {open ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-4">
          {/* ---------------------------------------- the catalogue titles */}
          {GITA_BOOKS.map((book) => (
            <Counter
              key={book.key}
              label={tm(`books.${book.key}.name`)}
              hint={`₹${book.price}`}
              value={counts[book.key] ?? 0}
              onChange={(value) =>
                setCounts((previous) => ({ ...previous, [book.key]: value }))
              }
            />
          ))}

          {/* ---------------------------------------------- anything else */}
          {extras.map((row, index) => (
            <div
              key={index}
              className="rounded-lg border border-border bg-background p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor={`extra-name-${volunteer.clerkId}-${index}`}
                  className="text-xs text-muted-foreground"
                >
                  {t("mar_stock_other_title")}
                </Label>
                <button
                  type="button"
                  aria-label={t("mar_cancel")}
                  onClick={() =>
                    setExtras((previous) =>
                      previous.filter((_, i) => i !== index),
                    )
                  }
                  className="grid size-7 place-items-center rounded-full text-muted-foreground hover:text-destructive"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>

              <Input
                id={`extra-name-${volunteer.clerkId}-${index}`}
                value={row.name}
                placeholder={t("mar_stock_other_placeholder")}
                onChange={(event) =>
                  setExtras((previous) =>
                    previous.map((item, i) =>
                      i === index
                        ? { ...item, name: event.target.value.slice(0, 80) }
                        : item,
                    ),
                  )
                }
                className="mt-1.5 h-10"
              />

              <div className="mt-2.5 flex items-end gap-3">
                <div className="w-28">
                  <Label
                    htmlFor={`extra-price-${volunteer.clerkId}-${index}`}
                    className="text-xs text-muted-foreground"
                  >
                    {t("mar_stock_price")}
                  </Label>
                  <Input
                    id={`extra-price-${volunteer.clerkId}-${index}`}
                    inputMode="numeric"
                    value={row.price}
                    onChange={(event) =>
                      setExtras((previous) =>
                        previous.map((item, i) =>
                          i === index
                            ? {
                                ...item,
                                price: event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6),
                              }
                            : item,
                        ),
                      )
                    }
                    className="mt-1.5 h-10 tabular-nums"
                  />
                </div>
                <div className="flex-1">
                  <Counter
                    label={t("mar_stock_count")}
                    value={Number(row.quantity) || 0}
                    onChange={(value) =>
                      setExtras((previous) =>
                        previous.map((item, i) =>
                          i === index ? { ...item, quantity: value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={() =>
              setExtras((previous) => [
                ...previous,
                { name: "", price: "", quantity: 0 },
              ])
            }
            className="self-start text-sm font-medium text-primary underline underline-offset-4"
          >
            {t("mar_stock_add_other")}
          </button>

          <div>
            <Label
              htmlFor={`stock-note-${volunteer.clerkId}`}
              className="text-xs text-muted-foreground"
            >
              {t("mar_stock_note")}
            </Label>
            <Input
              id={`stock-note-${volunteer.clerkId}`}
              value={note}
              placeholder={t("mar_stock_note_placeholder")}
              onChange={(event) => setNote(event.target.value.slice(0, 200))}
              className="mt-1.5 h-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 rounded-full"
              onClick={reset}
            >
              {t("mar_cancel")}
            </Button>
            <Button
              disabled={pending}
              className="flex-1 rounded-full"
              onClick={submit}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <BookPlus className="size-4" aria-hidden="true" />
              )}
              {t("mar_stock_save")}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 rounded-full"
          onClick={() => setOpen(true)}
        >
          <BookPlus className="size-3.5" aria-hidden="true" />
          {t("mar_stock_issue")}
        </Button>
      )}
    </div>
  );
}

/**
 * A signed stepper.
 *
 * Negative is not an error state here: it is how stock comes back. The minus
 * button keeps going past zero and the number turns red when it does, so a
 * coordinator can see at a glance which way a line is pointing before they
 * save it.
 */
function Counter({ label, hint, value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}</p>
        {hint && (
          <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          aria-label="-"
          onClick={() => onChange(Math.max(-500, value - 1))}
          className="grid size-9 place-items-center rounded-full border border-border transition-colors hover:border-primary/40"
        >
          <Minus className="size-3.5" aria-hidden="true" />
        </button>
        <span
          className={cn(
            "min-w-10 text-center text-base font-semibold tabular-nums",
            value < 0 && "text-destructive",
          )}
        >
          {value > 0 ? `+${value}` : value}
        </span>
        <button
          type="button"
          aria-label="+"
          onClick={() => onChange(Math.min(500, value + 1))}
          className="grid size-9 place-items-center rounded-full border border-border transition-colors hover:border-primary/40"
        >
          <Plus className="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
