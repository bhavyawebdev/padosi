/** Join truthy class names — the project's `cn` helper (no extra dep). */ export function cn(...classes: Array<string | false | null | undefined>): string { return classes.filter(Boolean).join(" ");
}
