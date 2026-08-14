/**
 * src/lib/security/index.ts — Security utilities
 *
 * Security principles:
 *   - Never trust browser-provided identity
 *   - Never expose exact coordinates
 *   - Never expose service role key to the browser
 *   - All authorization decisions happen server-side
 *   - RLS (Row Level Security) is the database-level enforcement
 *
 * Full implementation in Stage 1.
 */

/**
 * Strip sensitive fields before sending user data to the client.
 * Use in Server Components and API responses.
 */
export function sanitizeUserForClient<T extends object>(
  user: T,
  allowedFields: (keyof T)[]
): Partial<T> {
  return allowedFields.reduce((acc, field) => {
    acc[field] = user[field];
    return acc;
  }, {} as Partial<T>);
}

/**
 * Check if the current request originates from a trusted server context.
 * Used in admin-only route handlers.
 */
export function assertServerContext(): void {
  if (typeof window !== "undefined") {
    throw new Error(
      "[Aas-Paas Security] Admin utilities must only run server-side. " +
        "This function was called in a browser context."
    );
  }
}

/**
 * Simple check that an env var is set.
 * Use to fail fast on startup rather than at runtime.
 */
export function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(
      `[Aas-Paas] Required environment variable "${key}" is not set.`
    );
  }
  return val;
}
