export function joinClassNames(
  ...classNames: ReadonlyArray<string | false | null | undefined>
): string {
  return classNames.filter(Boolean).join(" ");
}
