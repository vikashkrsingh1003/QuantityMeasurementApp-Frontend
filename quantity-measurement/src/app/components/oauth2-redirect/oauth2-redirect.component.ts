import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-oauth2-redirect',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="redirect-wrap">
      <div class="redirect-card">
        <!-- Loading state -->
        <ng-container *ngIf="isLoading()">
          <div class="spinner"></div>
          <p>Processing OAuth redirect…</p>
        </ng-container>

        <!-- Success state - show user details -->
        <ng-container *ngIf="!isLoading() && userDetails() && !error()">
          <div class="success-icon">✓</div>
          <h2 class="success-title">Welcome!</h2>

          <div class="user-details">
            <div class="detail-item">
              <label>Name:</label>
              <p class="detail-value">{{ userDetails()?.name }}</p>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <p class="detail-value">{{ userDetails()?.email }}</p>
            </div>
          </div>

          <p class="redirect-msg">Redirecting to dashboard…</p>
        </ng-container>

        <!-- Error state -->
        <ng-container *ngIf="error()">
          <div class="error-icon">✗</div>
          <p class="err">{{ error() }}</p>
          <button class="retry-btn" (click)="goToLogin()">Go to Login</button>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .redirect-wrap {
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
      font-family: 'Nunito', sans-serif;
    }
    .redirect-card {
      background: #fff; border-radius: 16px; padding: 40px 48px;
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.15);
      display: flex; flex-direction: column; align-items: center; gap: 20px;
      max-width: 400px; width: 100%;
    }
    .spinner {
      width: 40px; height: 40px;
      border: 4px solid rgba(79,70,229,.2); border-top-color: #4f46e5;
      border-radius: 50%; animation: spin .8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .success-icon {
      width: 60px; height: 60px;
      background: #d1fae5; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; color: #059669; font-weight: bold;
    }

    .error-icon {
      width: 60px; height: 60px;
      background: #fee2e2; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 32px; color: #dc2626; font-weight: bold;
    }

    .success-title {
      margin: 0; font-size: 1.5rem; color: #1f2937; font-weight: 700;
    }

    .user-details {
      width: 100%; display: flex; flex-direction: column; gap: 12px;
      background: #f9fafb; border-radius: 12px; padding: 16px;
    }

    .detail-item {
      display: flex; flex-direction: column; gap: 4px;
    }

    .detail-item label {
      font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .detail-value {
      font-size: 0.95rem; font-weight: 600; color: #1f2937; margin: 0;
      word-break: break-all;
    }

    .redirect-msg {
      font-size: 0.85rem; color: #6b7280; margin: 8px 0 0 0; animation: pulse 1.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.7; }
      50% { opacity: 1; }
    }

    p { margin: 0; font-weight: 600; color: #374151; }
    .err { color: #dc2626; font-size: 0.95rem; }

    .retry-btn {
      margin-top: 16px; padding: 10px 24px;
      background: #4f46e5; color: white; border: none;
      border-radius: 8px; font-size: 0.9rem; font-weight: 600;
      cursor: pointer; transition: all 0.18s;
    }

    .retry-btn:hover {
      background: #4338ca; transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }
  `]
})
export class OAuth2RedirectComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  isLoading = signal(true);
  error = signal<string | null>(null);
  userDetails = signal<{ name: string; email: string } | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.error.set('No authentication token received.');
      this.isLoading.set(false);
      return;
    }

    // Store token
    localStorage.setItem('accessToken', token);
    this.authService.isAuthenticated.set(true);

    // Fetch user profile
    this.authService.getProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (userProfile) => {
          // Store to localStorage
          localStorage.setItem('userName', userProfile.name);
          localStorage.setItem('userEmail', userProfile.email);
          localStorage.setItem('userRole', userProfile.role);

          // Update signal
          this.authService.currentUser.set(userProfile);

          // Show user details
          this.userDetails.set({
            name: userProfile.name,
            email: userProfile.email
          });

          this.isLoading.set(false);

          // Auto-redirect after 2 seconds
          setTimeout(() => {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          }, 2000);
        },
        error: (err) => {
          console.error('Failed to fetch user profile:', err);
          this.error.set('Failed to fetch user details. Please try again.');
          this.isLoading.set(false);
        }
      });
  }

  goToLogin(): void {
    this.router.navigate(['/auth'], { replaceUrl: true });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
