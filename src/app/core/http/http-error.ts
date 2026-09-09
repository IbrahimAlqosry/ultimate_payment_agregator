import { HttpErrorResponse } from '@angular/common/http';
import { ProblemDetails } from '@core/models.platform';

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
