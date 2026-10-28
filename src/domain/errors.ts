/** Base class for errors that map to a known HTTP problem response. */
export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly title: string;
}

export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly title = "Unauthorized";
  constructor(message = "Authentication is required.") {
    super(message);
  }
}

export class InvalidCredentialsError extends UnauthorizedError {
  constructor() {
    // Generic on purpose: never reveal whether the email exists.
    super("Invalid email or password.");
  }
}

export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly title = "Forbidden";
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
  }
}

export class NotFoundError extends AppError {
  readonly status = 404;
  readonly title = "Not Found";
}

export class ConflictError extends AppError {
  readonly status = 409;
  readonly title = "Conflict";
}

export class BusinessRuleError extends AppError {
  readonly status = 400;
  readonly title = "Bad Request";
}
