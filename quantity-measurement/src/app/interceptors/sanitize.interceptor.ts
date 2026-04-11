import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';

/**
 * GLOBAL PAYLOAD SANITIZER INTERCEPTOR
 * Walks every outgoing POST/PUT/PATCH body and:
 *  • replaces null  → 0  for number-typed fields named "value"
 *  • replaces undefined → removes the key
 * This is a safety net — the primary fix is in buildSafeRequest().
 */
export const sanitizeInterceptor: HttpInterceptorFn = (req, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
    const cleaned = deepSanitize(req.body);
    const sanitized: HttpRequest<unknown> = req.clone({ body: cleaned });
    return next(sanitized);
  }
  return next(req);
};

function deepSanitize(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(deepSanitize);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj as Record<string, unknown>)) {
      if (val === undefined) continue; // strip undefined keys
      // For fields named "value" that are null → default to 0
      if (key === 'value' && val === null) {
        result[key] = 0;
      } else {
        result[key] = deepSanitize(val);
      }
    }
    return result;
  }
  return obj;
}
