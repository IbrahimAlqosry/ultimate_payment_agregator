import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '@core/models.platform';

/** Shared guard message for "we don't have the record's concurrencyToken yet, so submitting
 * would just fail server-side" — shown before ever making the request, so it's not a ProblemDetails
 * response and doesn't go through readApiError(). Kept as one plain string, matching how every
 * server-derived error in this app already displays (readApiError().message is never translated
 * either), rather than three near-identical copies drifting across call sites. */
export const MISSING_CONCURRENCY_TOKEN_MESSAGE = 'Missing concurrency token — reload and try again.';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
  /** Field-to-message-array validation errors, present on some real-backend `400`s. */
  fieldErrors?: Record<string, string[]>;
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return !!body && typeof body === 'object' && 'title' in body && 'status' in body;
}

export function readApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as ProblemDetails | { message?: unknown; code?: unknown } | string | null;

    if (isProblemDetails(body)) {
      return {
        status: error.status,
        message: body.detail || body.title || error.statusText || 'Request failed',
        code: body.traceId,
        fieldErrors: body.errors,
      };
    }

    const fromBody =
      body && typeof body === 'object' && 'message' in body && body.message != null ? String(body.message) : null;
    const code = body && typeof body === 'object' && 'code' in body && body.code != null ? String(body.code) : undefined;
    return {
      status: error.status,
      message: fromBody || error.statusText || 'Request failed',
      code,
    };
  }

  return { status: 0, message: 'Request failed' };
}
