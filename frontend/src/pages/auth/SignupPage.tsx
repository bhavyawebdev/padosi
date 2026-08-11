import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/common/Button";
import { Field, Input, SearchInput } from "@/components/common/Form";
import { PasswordInput } from "@/components/common/PasswordInput";
import { LoadingState } from "@/components/common/Feedback";
import { useLocalities } from "@/features/auth/authHooks";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useAuth } from "@/hooks/useAuth";
import type { UserRole } from "@/types";
import { AuthLayout } from "./AuthLayout";

const ROLES: Array<{ value: UserRole; label: string; icon: string; blurb: string }> = [
  { value: "individual", label: "Individual", icon: "person", blurb: "Post updates, ask for help, borrow & lend" },
  { value: "business", label: "Business", icon: "storefront", blurb: "Cooks, tutors, plumbers — get discovered" },
  { value: "community", label: "Community", icon: "groups", blurb: "RWA / society — post official notices" },
];

/** Quick city browse chips so newcomers aren't lost in a national list. */
const POPULAR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Chandigarh",
];

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState<UserRole>("individual");
  const [localityQuery, setLocalityQuery] = useState("");
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [localityId, setLocalityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: localities, isLoading } = useLocalities(cityFilter ?? undefined, localityQuery);

  const filtered = useMemo(
    () => (localityQuery || cityFilter ? (localities ?? []) : (localities ?? []).slice(0, 8)),
    [localities, localityQuery, cityFilter],
  );
  const selectedLocality = (localities ?? []).find((l) => l.id === localityId);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!localityId) {
      setError("Pick the locality you live in — it anchors trust on this platform.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await signup({
        full_name: fullName,
        email,
        password,
        phone: phone || null,
        role,
        locality_id: localityId,
      });
      navigate("/nearby", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout subtitle="Your neighborhood, verified.">
      <form onSubmit={onSubmit} className="space-y-8" noValidate>
        {error && (
          <p role="alert" className="text-label-md font-label-md text-error bg-error-container/40 rounded-xl px-5 py-3">
            {error}
          </p>
        )}

        <Field label="I am a…">
          <div className="grid grid-cols-3 gap-3">
            {ROLES.map((r) => (
              <button
                type="button"
                key={r.value}
                onClick={() => setRole(r.value)}
                aria-pressed={role === r.value}
                className={cn(
                  "flex flex-col items-center justify-center p-5 rounded-xl border transition-all group",
                  role === r.value
                    ? "bg-primary-container border-primary shadow-sm"
                    : "bg-surface border-outline-variant hover:bg-surface-variant",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "material-symbols-outlined text-[28px] mb-2 group-hover:-translate-y-0.5 transition-transform",
                    role === r.value ? "text-on-primary-container" : "text-primary",
                  )}
                  style={{ fontVariationSettings: "'FILL'1" }}
                >
                  {r.icon}
                </span>
                <span className="text-label-sm font-label-sm text-on-surface">{r.label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Full name">
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Asha Verma" autoComplete="name" />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="Phone" hint="Optional — enables OTP verification">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98xxxxxx" autoComplete="tel" />
          </Field>
        </div>

        <Field label="Password" hint="8+ characters — mixed case, numbers & symbols are best">
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            required
            minLength={8}
            showStrength
            placeholder="••••••••"
          />
        </Field>

        <Field label="Confirm password">
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </Field>

        <Field label="Where do you live?" hint="Choose your society/locality — posts are only visible nearby.">
          {/* City browse chips (the platform covers all of India) */}
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setCityFilter(null);
                setLocalityQuery("");
              }}
              className={cn(
                "px-3 py-1.5 rounded-full text-label-sm font-label-sm border transition-colors",
                cityFilter === null
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-variant",
              )}
            >
              All India
            </button>
            {POPULAR_CITIES.map((city) => (
              <button
                type="button"
                key={city}
                onClick={() => {
                  setCityFilter(city);
                  setLocalityQuery("");
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-label-sm font-label-sm border transition-colors",
                  cityFilter === city
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface text-on-surface-variant border-outline-variant hover:bg-surface-variant",
                )}
              >
                {city}
              </button>
            ))}
          </div>

          <SearchInput placeholder="Search your area…" value={localityQuery} onChange={(e) => setLocalityQuery(e.target.value)} aria-label="Search localities" />
          <div className="mt-3 max-h-44 overflow-y-auto rounded-xl border border-outline-variant divide-y divide-outline-variant/40">
            {isLoading ? (
              <div className="p-3">
                <LoadingState label="Loading areas…" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="p-5 text-label-sm font-label-sm text-on-surface-variant">No areas found — try a different spelling or city.</p>
            ) : (
              filtered.map((loc) => (
                <button
                  type="button"
                  key={loc.id}
                  onClick={() => {
                    setLocalityId(loc.id);
                    setLocalityQuery(loc.name);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-surface-variant transition-colors",
                    selectedLocality?.id === loc.id && "bg-primary/10",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-body-md font-body-md text-on-surface truncate">{loc.name}</span>
                    <span className="block text-label-sm font-label-sm text-on-surface-variant">
                      {loc.city} · {loc.state}
                    </span>
                  </span>
                  {selectedLocality?.id === loc.id && (
                    <span aria-hidden className="material-symbols-outlined text-primary text-[18px] shrink-0" style={{ fontVariationSettings: "'FILL'1" }}>
                      check_circle
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </Field>

        <Button type="submit" size="lg" className="w-full" loading={submitting} disabled={!localityId}>
          Join your neighborhood
        </Button>
        <p className="text-center text-body-md font-body-md text-on-surface-variant">
          Already a neighbor?{""}
          <Link to="/login" className="text-primary font-semibold underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
