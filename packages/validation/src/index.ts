export type ValidationResult<T> =
  { success: true; data: T } | { success: false; issues: readonly string[] };

export * from "./intake";
export * from "./public-content";
