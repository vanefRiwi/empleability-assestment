import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../../../domain/errors";
import { sendProblem } from "../problem";

export const notFoundHandler: RequestHandler = (req, res) => {
  sendProblem(res, 404, "Not Found", "The requested resource does not exist.", req.originalUrl);
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof ZodError) {
    const errors = error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    sendProblem(res, 422, "Unprocessable Content", "The request contains invalid fields.", req.originalUrl, errors);
    return;
  }

  if (error instanceof AppError) {
    sendProblem(res, error.status, error.title, error.message, req.originalUrl);
    return;
  }

  // Malformed JSON bodies from express.json().
  if (error?.type === "entity.parse.failed") {
    sendProblem(res, 400, "Bad Request", "The request body is not valid JSON.", req.originalUrl);
    return;
  }

  // Do not log raw error objects: database/driver errors may contain SQL or
  // parameters. Keep this fallback intentionally free of request bodies,
  // headers, tokens, connection strings, and error messages.
  console.error("Unhandled HTTP error", {
    errorName: error instanceof Error ? error.name : "UnknownError",
    method: req.method,
    path: req.path,
  });
  sendProblem(res, 500, "Internal Server Error", "An unexpected error occurred.", req.originalUrl);
};
