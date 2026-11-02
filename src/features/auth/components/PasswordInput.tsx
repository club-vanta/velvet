import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import {
  MIN_PASSWORD_LENGTH,
  minCharsMessage,
  passwordLength,
} from "../lib/password";

type Props = Omit<React.ComponentProps<typeof Input>, "type" | "minLength"> & {
  /**
   * For a new password: a value shorter than MIN_PASSWORD_LENGTH blocks the
   * form with the translated "Minimum 15 characters." instead of the
   * browser's own message, whatever filled the field in.
   */
  enforceMinLength?: boolean;
};

/** A password field with a show/hide toggle that keyboards and screen readers reach. */
export function PasswordInput({
  className,
  enforceMinLength = false,
  onChange,
  ...props
}: Props) {
  const { t } = useLanguage();
  const [visible, setVisible] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (enforceMinLength) {
      const length = passwordLength(e.target.value);
      const tooShort = length > 0 && length < MIN_PASSWORD_LENGTH;
      e.target.setCustomValidity(tooShort ? minCharsMessage(t) : "");
    }
    onChange?.(e);
  }

  return (
    <div className="relative">
      <Input
        {...props}
        minLength={enforceMinLength ? MIN_PASSWORD_LENGTH : undefined}
        onChange={handleChange}
        type={visible ? "text" : "password"}
        className={cn("pr-10", className)}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={t(visible ? "hidePassword" : "showPassword")}
        aria-pressed={visible}
        data-cy="password-visibility"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {visible ? (
          <EyeOff className="h-4 w-4" aria-hidden />
        ) : (
          <Eye className="h-4 w-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
