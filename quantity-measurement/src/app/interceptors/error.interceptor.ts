import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = '';

      if (error.status === 0) {
        errorMessage = 'Server is not running. Please check your backend service.';
      } else if (error.status === 400) {
        errorMessage = error.error?.message || 'Bad request. Please check your input.';
      } else if (error.status === 401) {
        const isLoginRequest = req.url.includes('/login');
        const isProfileRequest = req.url.includes('/me');

        // Don't clear auth state for profile fetch requests (they fail during OAuth callback recovery)
        if (!isProfileRequest) {
          authService.clearAuthOnTokenExpiry();
        }

        errorMessage = isLoginRequest ? 'Wrong email or password' : 'Session expired. Please log in again.';

        // Redirect to login only for protected resource requests, not profile/login endpoints
        if (!req.url.includes('/auth') && !isLoginRequest && !isProfileRequest) {
          router.navigate(['/auth']);
        }
      } else if (error.status === 403) {
        errorMessage = 'Access denied.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found.';
      } else if (error.status === 409) {
        errorMessage = error.error?.message || 'This email is already registered.';
      } else if (error.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else {
        errorMessage = error.error?.message || 'An unexpected error occurred.';
      }

      const customError = new Error(errorMessage);
      return throwError(() => customError);
    })
  );
};
