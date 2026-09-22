"use client"

import { Languages } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function LocaleToggle({ compact = false }: { compact?: boolean }) {
  const locale = useLocale()
  const t = useTranslations("common")

  const selectLocale = (nextLocale: "en" | "bn") => {
    document.cookie = `BUSOS_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`
    window.location.reload()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("language")}>
          <Languages className="h-4 w-4" />
          {!compact && <span className="ml-2 uppercase">{locale}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("language")}</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => selectLocale("en")} aria-current={locale === "en"}>
          {t("english")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => selectLocale("bn")} aria-current={locale === "bn"}>
          {t("bangla")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
