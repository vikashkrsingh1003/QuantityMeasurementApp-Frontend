import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

/**
 * OAuthCallbackComponent
 *
 * Handles OAuth2 callback from backend after Google login.
 * Backend redirects here with token in query param:
 *   http://localhost:4200/oauth2/callback?token=<JWT>
 *
 * Flow:
 * 1. Extract token from URL
 * 2. Call AuthService.handleOAuthCallback(token)
 * 3. AuthService fetches user profile from /me endpoint
 * 4. Signals update reactively → Navbar updates
 * 5. Navigate to dashboard
 */
@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="callback-wrap">
      <div class="callback-card">
        <div class="spinner"></div>
        <p *ngIf="!error">Completing Google Sign-In…</p>
        <p *ngIf="error" class="err">{{ error }}</p>
      </div>
    </div>
  `,
  styles: [`
    .callback-wrap {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: #f0f2ff; font-family: 'Nunito', sans-serif;
    }
    .callback-card {
      background: #fff; border-radius: 16px; padding: 40px 48px;
      box-shadow: 0 4px 32px rgba(79,70,229,.1);
      display: flex; flex-direction: column; align-items: center; gap: 20px;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid rgba(79,70,229,.2); border-top-color: #4f46e5;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    p { font-size: 1rem; font-weight: 600; color: #374151; margin: 0; }
    .err { color: #dc2626; }
  `]
})
export class OAuthCallbackComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private destroy$    = new Subject<void>();

  error: string | null = null;

  ngOnInit(): void {
    // Extract token from URL query params
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error = 'No token received. Authentication failed.';
      setTimeout(() => this.router.navigate(['/auth'], { replaceUrl: true }), 2000);
      return;
    }

    // IMPORTANT: Handle callback and clean URL
    // 1. handleOAuthCallback will navigate to /dashboard
    // 2. We listen to ensure navigation completes with replaceUrl
    // 3. This removes the token from URL and browser history
    this.authService.handleOAuthCallback(token)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          // Success: token stored, user fetched, signals updated
          // Navigation to /dashboard already handled by service
          // URL is now clean (no token visible)
        },
        error: (err) => {
          console.error('OAuth callback error:', err);
          this.error = 'Failed to complete sign-in. Please try again.';
          setTimeout(() => this.router.navigate(['/auth'], { replaceUrl: true }), 2000);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
