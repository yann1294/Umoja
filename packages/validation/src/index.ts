export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: readonly string[] };
