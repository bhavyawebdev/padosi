import { useState, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  value: string;
  onChange: (value: string) => void;
  /** Show a live strength meter under the field. */
  showStrength?: boolean;
}

interface Strength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

export function passwordStrength(pw: string): Strength {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(score, 4) as Strength["score"];
  const labels: Record<number, string> = { 0: "Too short", 1: "Weak", 2: "Fair", 3: "Good", 4: "Strong" };
  return { score: clamped, label: labels[clamped] };
}

const METER_COLORS = ["bg-error", "bg-error", "bg-secondary", "bg-primary", "bg-primary"];
const METER_LABEL_COLORS = ["text-error", "text-error", "text-secondary", "text-primary", "text-primary"];

export function PasswordInput({
  className,
  value,
  onChange,
  showStrength = false,
  ...rest
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const strength = passwordStrength(value);

  return (
    <div className="space-y-1.5">
      <div className="relative">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full bg-surface rounded-xl border border-outline-variant px-5 py-3 pr-12 font-body-md text-body-md text-on-background placeholder:text-outline focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-shadow",
            className,
          )}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors"
        >
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            {visible ? "visibility_off" : "visibility"}
          </span>
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1 flex-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  i < strength.score ? METER_COLORS[strength.score] : "bg-outline-variant",
                )}
              />
            ))}
          </div>
          <span className={cn("text-label-sm font-label-sm", METER_LABEL_COLORS[strength.score])}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
