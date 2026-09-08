"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toggleFlag } from "@/app/[locale]/admin/flags/actions";

export function FlagsTable({ flags }) {
  const t = useTranslations("admin");
  const [items, setItems] = useState(flags);
  const [isPending, startTransition] = useTransition();

  function handleToggle(key, enabled) {
    setItems((prev) =>
      prev.map((f) => (f.key === key ? { ...f, enabled } : f))
    );
    startTransition(async () => {
      try {
        await toggleFlag(key, enabled);
      } catch {
        toast.error("Failed to update flag");
        setItems((prev) =>
          prev.map((f) => (f.key === key ? { ...f, enabled: !enabled } : f))
        );
      }
    });
  }

  return (
    <div className="mt-8 overflow-x-auto rounded-xl border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-muted-foreground">{t("flag_key")}</TableHead>
            <TableHead className="text-muted-foreground">{t("flag_scope")}</TableHead>
            <TableHead className="text-muted-foreground">{t("flag_status")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((flag) => (
            <TableRow key={flag.key}>
              <TableCell className="font-mono text-xs text-foreground">
                {flag.key}
                {flag.temporary && (
                  <Badge variant="secondary" className="ml-2 text-[10px]">
                    temporary
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">{flag.scope}</TableCell>
              <TableCell>
                <Switch
                  checked={flag.enabled}
                  disabled={isPending}
                  onCheckedChange={(v) => handleToggle(flag.key, v)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
