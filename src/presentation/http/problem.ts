import type { Response } from "express";

export interface FieldIssue {
  field: string;
  message: string;
}

/** Sends an RFC 9457 problem details response. */
export function sendProblem(
  res: Response,
  status: number,
  title: string,
  detail: string,
  instance: string,
  errors?: FieldIssue[],
): void {
  res
    .status(status)
    .type("application/problem+json")
    .json({ type: "about:blank", title, status, detail, instance, ...(errors ? { errors } : {}) });
}
