import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { sanitizeInterceptor } from './interceptors/sanitize.interceptor';
import { errorInterceptor } from './interceptors/error.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(
      withFetch(),
      withInterceptors([
        authInterceptor,      // 1st: attach Bearer token
        sanitizeInterceptor,  // 2nd: strip null/undefined from body
        errorInterceptor,     // 3rd: handle errors gracefully
      ])
    ),
    provideRouter(routes),
  ],
};
