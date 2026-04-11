import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of } from 'rxjs';
import { LoginRequest, RegisterRequest, AuthResponse, UserProfile } from '../models/auth.models';
import { extractNameFromJwt, extractEmailFromJwt } from '../utils/jwt.util';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http     = inject(HttpClient);
  private readonly router   = inject(Router);
  private readonly BASE_URL = 'http://localhost:8080/api/v1/auth';

  /**
   * OAuth2 URLs:
   * - Standard: Auto-login if user already authenticated with Google
   * - WithSelectAccount: Forces Google to show account chooser (use after logout)
   * - WithLogin: Forces full re-authentication (most secure but annoying UX)
   */
  private readonly GOOGLE_OAUTH_URL = 'http://localhost:8080/oauth2/authorization/google';
  private readonly GOOGLE_OAUTH_URL_SELECT_ACCOUNT =
    'http://localhost:8080/oauth2/authorization/google?prompt=select_account';
  private readonly GOOGLE_OAUTH_URL_LOGIN =
    'http://localhost:8080/oauth2/authorization/google?prompt=login';

  isAuthenticated = signal<boolean>(this.hasToken());
  currentUser     = signal<UserProfile | null>(this.loadUserFromStorage());
  userName        = signal<string>(localStorage.getItem('userName') || '');
  userEmail       = signal<string>(localStorage.getItem('userEmail') || '');

  private hasToken(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  private loadUserFromStorage(): UserProfile | null {
    const name  = localStorage.getItem('userName');
    const email = localStorage.getItem('userEmail');
    const role  = localStorage.getItem('userRole');
    if (name && email) return { name, email, role: role ?? 'USER' };
    return null;
  }

  /** Refresh user data from localStorage - call after OAuth or login */
  refreshUserFromStorage(): void {
    const user = this.loadUserFromStorage();
    if (user) {
      this.currentUser.set(user);
      this.userName.set(user.name);
      this.userEmail.set(user.email);
      console.log('User refreshed from localStorage:', user);
    }
  }

  private getLastLogoutTime(): number {
    const stored = sessionStorage.getItem('lastLogoutTime');
    return stored ? parseInt(stored, 10) : 0;
  }

  private setLastLogoutTime(time: number): void {
    sessionStorage.setItem('lastLogoutTime', time.toString());
  }

  /** Standard email + password login */
  login(payload: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/login`, payload).pipe(
      tap(res => this.handleAuthSuccess(res))
    );
  }

  /**
   * Google OAuth login
   *
   * After logout: Redirects with prompt=select_account to force account chooser
   * Normal flow: Standard redirect (supports silent re-auth if user wants)
   *
   * How it works:
   * 1. User logs out → lastLogoutTime persisted to sessionStorage
   * 2. When user clicks "Login with Google" → check if recently logged out
   * 3. If within 10 seconds → use prompt=select_account URL
   * 4. Otherwise → use standard URL (faster if user wants quick re-login)
   */
  loginWithGoogle(forceSelectAccount: boolean = false): void {
    const timeSinceLogout = Date.now() - this.getLastLogoutTime();
    const shouldForceSelect = forceSelectAccount || timeSinceLogout < 10000; // 10 seconds

    const oauthUrl = shouldForceSelect
      ? this.GOOGLE_OAUTH_URL_SELECT_ACCOUNT
      : this.GOOGLE_OAUTH_URL;

    // Clear logout time after using it (so repeated logins don't force select_account)
    if (shouldForceSelect) {
      sessionStorage.removeItem('lastLogoutTime');
    }

    window.location.href = oauthUrl;
  }

  /** Register — no auto-login */
  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/register`, payload);
  }

  /**
   * Logout: Clears app session + cleans URL history
   *
   * Important Steps:
   * 1. Clear all auth data from localStorage
   * 2. Reset signals to unauthenticated state
   * 3. Record logout time to force Google account chooser on next login (within 10 seconds)
   * 4. Navigate to /auth with replaceUrl=true to remove any tokens from history
   *
   * Note: Google session is separate from app session.
   * To force complete Google logout, use logoutFromGoogleCompletely()
   */
  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);

    // Record logout time to force account chooser on next login (within 10 seconds)
    this.setLastLogoutTime(Date.now());

    // Navigate to dashboard with replaceUrl=true to clean history
    // This removes any previous dashboard/callback URLs with tokens from browser history
    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }

  /**
   * OAuth Callback Handler - SIMPLIFIED
   * 1. Extract name from JWT token immediately
   * 2. Store in localStorage
   * 3. Set signal
   * 4. Navigate to dashboard
   */
  handleOAuthCallback(token: string): Observable<UserProfile> {
    console.log('=== OAUTH CALLBACK START ===');
    console.log('Token:', token.substring(0, 50) + '...');

    // Store token
    localStorage.setItem('accessToken', token);
    this.isAuthenticated.set(true);
    console.log('Token stored in localStorage');

    // Extract name from JWT
    const nameFromToken = extractNameFromJwt(token);
    const emailFromToken = extractEmailFromJwt(token);
    console.log('Extracted from JWT - name:', nameFromToken, 'email:', emailFromToken);

    // Create user object
    const user: UserProfile = {
      name: nameFromToken || 'User',
      email: emailFromToken || '',
      role: 'USER'
    };
    console.log('Created user object:', user);

    // Store to localStorage
    localStorage.setItem('userName', user.name);
    localStorage.setItem('userEmail', user.email);
    localStorage.setItem('userRole', user.role);
    console.log('Stored to localStorage:', {
      userName: localStorage.getItem('userName'),
      userEmail: localStorage.getItem('userEmail'),
      userRole: localStorage.getItem('userRole')
    });

    // Update signal
    this.currentUser.set(user);
    this.userName.set(user.name);
    this.userEmail.set(user.email);
    console.log('Updated signals:', {
      currentUser: this.currentUser(),
      userName: this.userName(),
      userEmail: this.userEmail()
    });

    // Navigate
    console.log('Navigating to dashboard...');
    this.router.navigate(['/dashboard'], { replaceUrl: true });

    console.log('=== OAUTH CALLBACK COMPLETE ===');

    // Return the user
    return of(user);
  }

  /**
   * Fetch current user profile from backend
   * Should only be called when token exists
   */
  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.BASE_URL}/me`);
  }

  /**
   * Handle token expiration (401 Unauthorized)
   * Called by HTTP error interceptor when backend returns 401
   * Clears auth state without navigation (interceptor handles that)
   */
  clearAuthOnTokenExpiry(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    this.isAuthenticated.set(false);
    this.currentUser.set(null);
    this.userName.set('');
    this.userEmail.set('');
  }

  /** Helper: Store user profile in localStorage */
  private storeUserProfile(user: UserProfile): void {
    // Ensure we have valid values
    const finalName = (user?.name && user.name.trim()) ? user.name.trim() : 'User';
    const finalEmail = (user?.email && user.email.trim()) ? user.email.trim() : 'oauth-user';
    const finalRole = user?.role || 'USER';

    console.log('Storing to localStorage:', { finalName, finalEmail, finalRole });
    localStorage.setItem('userName',  finalName);
    localStorage.setItem('userEmail', finalEmail);
    localStorage.setItem('userRole',  finalRole);
  }

  /**
   * Reinitialize user from localStorage
   * Called after OAuth/login to ensure signals are in sync with storage
   */
  reinitializeUserFromStorage(): void {
    const user = this.loadUserFromStorage();
    console.log('Reinitializing user from storage:', user);
    this.currentUser.set(user);
  }

  /**
   * Debug: Log current auth state
   */
  debugAuthState(): void {
    console.log('=== AUTH STATE DEBUG ===');
    console.log('Token:', this.getToken());
    console.log('CurrentUser signal:', this.currentUser());
    console.log('localStorage userName:', localStorage.getItem('userName'));
    console.log('localStorage userEmail:', localStorage.getItem('userEmail'));
    console.log('localStorage userRole:', localStorage.getItem('userRole'));
    console.log('isAuthenticated signal:', this.isAuthenticated());
  }

  getToken():    string | null { return localStorage.getItem('accessToken'); }
  getUserName(): string        { return localStorage.getItem('userName') || 'User'; }
  getUserEmail(): string       { return localStorage.getItem('userEmail') || ''; }

  /** Get name directly from localStorage */
  getName(): string {
    return localStorage.getItem('userName') || 'User';
  }

  /** Get email directly from localStorage */
  getEmail(): string {
    return localStorage.getItem('userEmail') || '';
  }

  /** Get current user - reads from signal, falls back to localStorage */
  getCurrentUser(): UserProfile | null {
    const signalUser = this.currentUser();
    if (signalUser?.name && signalUser?.email) {
      return signalUser;
    }
    // Fallback: read fresh from localStorage
    return this.loadUserFromStorage();
  }

  /** Common success handler for regular login */
  private handleAuthSuccess(res: AuthResponse): void {
    localStorage.setItem('accessToken', res.accessToken);
    this.storeUserProfile({ name: res.name, email: res.email, role: res.role });
    this.isAuthenticated.set(true);
    this.currentUser.set({ name: res.name, email: res.email, role: res.role });
    this.userName.set(res.name);
    this.userEmail.set(res.email);
    // Add small delay before navigation to show success toast
    setTimeout(() => {
      this.router.navigate(['/dashboard']);
    }, 300);
  }

  /**
   * ========== ADVANCED OPTIONS ==========
   * Use these for specific OAuth behaviors
   */

  /**
   * Force account chooser — always show (most compatible)
   * Returns user to Google account selection screen every time
   * Use when: User explicitly clicks "Choose a different Google account"
   */
  loginWithGoogleForceAccountChooser(): void {
    window.location.href = this.GOOGLE_OAUTH_URL_SELECT_ACCOUNT;
  }

  /**
   * Force full re-authentication (most secure, but annoying UX)
   * User must re-enter Google password
   * Use when: Sensitive operation or security requirement
   * Warning: Very disruptive to user experience
   */
  loginWithGoogleForceLogin(): void {
    window.location.href = this.GOOGLE_OAUTH_URL_LOGIN;
  }

  /**
   * Logout from both app AND Google session
   * WARNING: This also logs user out from all Google services (Gmail, Drive, etc)
   * Use carefully! Only if explicitly requested by user
   *
   * How it works:
   * 1. Clears app session (localStorage, signals)
   * 2. Redirects to Google logout endpoint
   * 3. Google clears its session cookies
   * 4. Redirects back to login page
   */
  logoutFromGoogleCompletely(): void {
    // Step 1: Clear app session
    this.logout();

    // Step 2: Redirect to Google logout
    // This will log out user from Google too
    const returnUrl = window.location.origin + '/auth';
    const googleLogoutUrl = `https://accounts.google.com/Logout?continue=https://appengine.google.com`;
    window.location.href =
      `https://mail.google.com/mail/u/0/?logout&rd=${encodeURIComponent(returnUrl)}`;

    // Alternative (simpler, but deprecated):
    // window.location.href = `https://accounts.google.com/Logout`;
  }
}
