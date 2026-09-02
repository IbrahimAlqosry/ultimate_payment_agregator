import { HttpErrorResponse } from '@angular/common/http';

export interface ApiError {
  status: number;
  message: string;
  code?: string;
}

export function readApiError(error: unknown): ApiError {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: unknown; code?: unknown } | string | null;
    const fromBody =
      body && typeof body === 'object' && body.message != null ? String(body.message) : null;
    const code = body && typeof body === 'object' && body.code != null ? String(body.code) : undefined;
    return {
      status: error.status,
      message: fromBody || error.statusText || 'Request failed',
      code,
    };
  }

  return { status: 0, message: 'Request failed' };
}
