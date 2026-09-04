"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WhatsappIcon } from "@/components/site/WhatsappIcon";
import { saveWhatsappGroupUrl } from "@/app/[locale]/admin/settings/actions";

/**
 * The one control on the admin dashboard: paste an invite link, press save.
 *
 * The field is seeded with whatever is live — the stored value, or the
 * built-in default when nothing has been stored yet — so the admin is always
 * editing the real link rather than an empty box they have to fill from
 * memory. `isDefault` says which of the two they are looking at, because
 * "this is the fallback in the code" and "this is what someone saved" call
 * for different confidence before overwriting.
 *
 * "Open link" sits next to Save on purpose. A WhatsApp invite is a string
 * nobody can proofread by eye — an expired or mistyped group link looks
 * exactly like a working one — so the only real check is opening it, and the
 * moment to do that is before the save, not after a visitor reports it.
 *
 * Validation errors come back from the action as message keys and are shown
 * under the field rather than as a toast: the toast is gone in four seconds
 * and the mistake is still in the box.
 */
export function WhatsappLinkForm({ current, isDefault, updatedAt }) {
  const t = useTranslations("admin");
  const format = useFormatter();
  const [value, setValue] = useState(current);
  const [error, setError] = useState(null);
  const [live, setLive] = useState(current);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await saveWhatsappGroupUrl(value);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        // The action normalises the URL, so show what was actually stored.
        setValue(result.url);
        setLive(result.url);
        toast.success(t("whatsapp_saved"));
      } catch {
        toast.error(t("save_failed"));
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8">
      <Label htmlFor="whatsapp-url" className="text-foreground">
        <WhatsappIcon className="size-4 text-[#25D366]" />
        {t("whatsapp_label")}
      </Label>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          id="whatsapp-url"
          name="whatsapp-url"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={isPending}
          aria-invalid={error ? true : undefined}
          aria-describedby="whatsapp-url-hint"
          onValueChange={(next) => setValue(next)}
          placeholder="https://chat.whatsapp.com/…"
          className="h-11 flex-1 font-mono text-xs"
        />

        <div className="flex gap-2">
          <Button
            type="submit"
            size="lg"
            disabled={isPending || !value.trim()}
            className="rounded-full"
          >
            {t("save")}
          </Button>

          {/* Deliberately points at `live`, not `value`: this opens the link
              the site is currently handing to visitors, so it stays honest
              while the field is half-edited. */}
          <Button
            type="button"
            size="lg"
            variant="outline"
            className="rounded-full"
            render={
              <a href={live} target="_blank" rel="noopener noreferrer" />
            }
          >
            <ExternalLink className="size-4" aria-hidden="true" />
            {t("whatsapp_test")}
          </Button>
        </div>
      </div>

      {error ? (
        <p className="mt-2 text-sm font-medium text-destructive">{t(error)}</p>
      ) : (
        <p id="whatsapp-url-hint" className="mt-2 text-sm text-foreground/55">
          {t("whatsapp_hint")}
        </p>
      )}

      <p className="mt-6 text-xs text-foreground/45">
        {isDefault
          ? t("whatsapp_default")
          : t("whatsapp_updated", {
              date: updatedAt
                ? format.dateTime(new Date(updatedAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "—",
            })}
      </p>
    </form>
  );
}
