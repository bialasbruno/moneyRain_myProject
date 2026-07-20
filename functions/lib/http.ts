import { ZodError } from 'zod';

const privateHeaders = {
  'Cache-Control': 'no-store, private',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

export function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return Response.json(data, { status, headers: { ...privateHeaders, ...extraHeaders } });
}

export function apiError(code: string, message: string, requestId: string, status = 400): Response {
  return json({ error: { code, message, requestId } }, status);
}

export function requestId(request: Request): string {
  return request.headers.get('cf-ray') ?? crypto.randomUUID();
}

export async function bodyJson(request: Request): Promise<unknown> {
  const length = Number(request.headers.get('content-length') ?? 0);
  if (length > 1_000_000) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'Dane są zbyt duże.');
  return request.json();
}

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export function errorResponse(error: unknown, id: string): Response {
  if (error instanceof HttpError) return apiError(error.code, error.message, id, error.status);
  if (error instanceof ZodError) {
    return apiError('VALIDATION_ERROR', error.issues[0]?.message ?? 'Nieprawidłowe dane.', id, 422);
  }
  return apiError('INTERNAL_ERROR', 'Nie udało się wykonać operacji.', id, 500);
}

export function assertSameOrigin(request: Request): void {
  if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)) return;
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new HttpError(403, 'ORIGIN_REJECTED', 'Żądanie pochodzi z niedozwolonego źródła.');
  }
}
