import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { MENU_TRIGGER_CLASS } from "./menuTrigger";

// Each language is named in itself, whatever the UI language, so a viewer
// who cannot read the current one still finds theirs.
const LANGUAGES: { lang: Lang; flag: string; name: string }[] = [
  { lang: "es", flag: "🇦🇷", name: "Español" },
  { lang: "en", flag: "🇺🇸", name: "English" },
];

export function LanguageMenu() {
  const { t, lang, setLang } = useLanguage();
  const current = LANGUAGES.find((l) => l.lang === lang);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t("languageMenu")}
        data-cy="shell-language-menu"
        className={MENU_TRIGGER_CLASS}
      >
        <Languages className="h-3.5 w-3.5" aria-hidden />
        <span aria-hidden>{current?.flag}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {LANGUAGES.map((option) => (
          <DropdownMenuItem
            key={option.lang}
            lang={option.lang}
            data-cy={`shell-language-option-${option.lang}`}
            onClick={() => setLang(option.lang)}
            className={cn(option.lang === lang && "font-medium")}
          >
            <span aria-hidden>{option.flag}</span> {option.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
