export class IntakeRepositoryAccessError extends Error {
  readonly code = "INTAKE_ACCESS_DENIED";

  constructor() {
    super("The intake submission is unavailable.");
    this.name = "IntakeRepositoryAccessError";
  }
}
