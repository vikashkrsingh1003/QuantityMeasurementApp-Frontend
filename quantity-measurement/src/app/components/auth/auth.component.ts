import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators, ValidationErrors } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type AuthTab = 'login' | 'signup';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './auth.component.html',
  styleUrls: ['./auth.component.scss']
})
export class AuthComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private route       = inject(ActivatedRoute);

  activeTab          = signal<AuthTab>('login');
  isLoading          = signal(false);
  errorMessage       = signal<string | null>(null);
  successMessage     = signal<string | null>(null);
  showLoginPassword  = signal(false);
  showSignupPassword = signal(false);
  showSignupConfirmPassword = signal(false);

  private emailValidator = (control: FormControl): ValidationErrors | null => {
    const email = control.value;
    if (!email) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) ? null : { invalidEmail: true };
  };

  private passwordMatchValidator = (group: FormGroup): ValidationErrors | null => {
    const passwordCtrl = group.get('password');
    const confirmPasswordCtrl = group.get('confirmPassword') as FormControl;

    if (!passwordCtrl || !confirmPasswordCtrl) {
      return null;
    }

    const password = passwordCtrl.value;
    const confirmPassword = confirmPasswordCtrl.value;

    // Only validate if both fields have values
    if (!password || !confirmPassword) {
      return null;
    }

    if (password !== confirmPassword) {
      // Passwords don't match - add passwordMismatch error while preserving other errors
      const existingErrors = confirmPasswordCtrl.errors || {};
      confirmPasswordCtrl.setErrors({ ...existingErrors, passwordMismatch: true });
      return { passwordMismatch: true };
    } else {
      // Passwords match - remove only the passwordMismatch error
      const existingErrors = confirmPasswordCtrl.errors;
      if (existingErrors && existingErrors['passwordMismatch']) {
        const { passwordMismatch, ...otherErrors } = existingErrors;
        const newErrors = Object.keys(otherErrors).length > 0 ? otherErrors : null;
        confirmPasswordCtrl.setErrors(newErrors);
      }
    }

    return null;
  };

  loginForm: FormGroup = this.fb.group({
    email:    ['', [Validators.required, this.emailValidator]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  signupForm: FormGroup = this.fb.group({
    name:     ['', [Validators.required, Validators.minLength(2)]],
    email:    ['', [Validators.required, this.emailValidator]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(8)]]
  }, { validators: this.passwordMatchValidator });

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (tab === 'signup') this.activeTab.set('signup');
  }

  // ── Tab ──────────────────────────────────────────────────────────────────
  switchTab(tab: AuthTab): void {
    this.activeTab.set(tab);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.loginForm.reset();
    this.signupForm.reset();
  }

  toggleLoginPassword():  void { this.showLoginPassword.set(!this.showLoginPassword()); }
  toggleSignupPassword(): void { this.showSignupPassword.set(!this.showSignupPassword()); }
  toggleSignupConfirmPassword(): void { this.showSignupConfirmPassword.set(!this.showSignupConfirmPassword()); }

  // ── Login ─────────────────────────────────────────────────────────────────
  onLogin(): void {
    if (this.loginForm.invalid) { this.loginForm.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;
    this.authService.login({ email, password }).subscribe({
      next:  () => {
        this.isLoading.set(false);
        this.successMessage.set('✅ Login successful!');
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Invalid credentials. Please try again.');
      }
    });
  }

  /**
   * Google Sign-In — redirects the browser to Spring Security's OAuth2 endpoint.
   * Spring Security handles the entire Google flow, then redirects back to
   * http://localhost:4200/oauth2/callback?token=<JWT>&name=...&email=...
   */
  onGoogleLogin(): void {
    this.authService.loginWithGoogle();
  }

  // ── Signup ────────────────────────────────────────────────────────────────
  onSignup(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { name, email, password } = this.signupForm.value;
    this.authService.register({ name, email, password }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.successMessage.set('✅ Account created! Please log in.');
        this.signupForm.reset();
        setTimeout(() => { this.successMessage.set(null); this.switchTab('login'); }, 1800);
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.message || 'Signup failed. Email may already be in use.');
      }
    });
  }

  goToDashboard(): void { this.router.navigate(['/dashboard']); }

  // ── Template-safe getters ─────────────────────────────────────────────────
  get isLoginTab():        boolean     { return this.activeTab() === 'login'; }
  get isSignupTab():       boolean     { return this.activeTab() === 'signup'; }
  get isTabRight():        boolean     { return this.activeTab() === 'signup'; }
  get loginPassVisible():  boolean     { return this.showLoginPassword(); }
  get signupPassVisible(): boolean     { return this.showSignupPassword(); }
  get confirmPassVisible(): boolean    { return this.showSignupConfirmPassword(); }
  get loading():           boolean     { return this.isLoading(); }
  get successMsg():        string|null { return this.successMessage(); }
  get errorMsg():          string|null { return this.errorMessage(); }

  get lfEmail()    { return this.loginForm.get('email')!; }
  get lfPassword() { return this.loginForm.get('password')!; }
  get sfName()     { return this.signupForm.get('name')!; }
  get sfEmail()    { return this.signupForm.get('email')!; }
  get sfPassword() { return this.signupForm.get('password')!; }
  get sfConfirmPassword() { return this.signupForm.get('confirmPassword')!; }

  get lfEmailError():    string { return this.lfEmail.errors?.['required']    ? 'Email is required'    : this.lfEmail.errors?.['invalidEmail'] ? 'Enter a valid email (e.g., user@example.com)' : 'Enter a valid email'; }
  get lfPasswordError(): string { return this.lfPassword.errors?.['required'] ? 'Password is required' : 'Minimum 8 characters'; }
  get sfEmailError():    string { return this.sfEmail.errors?.['required']    ? 'Email is required'    : this.sfEmail.errors?.['invalidEmail'] ? 'Enter a valid email (e.g., user@example.com)' : 'Enter a valid email'; }
  get sfPasswordError(): string { return this.sfPassword.errors?.['required'] ? 'Password is required' : 'Minimum 8 characters'; }
  get sfConfirmPasswordError(): string {
    if (this.sfConfirmPassword.errors?.['required']) return 'Confirm password is required';
    if (this.sfConfirmPassword.errors?.['minlength']) return 'Minimum 8 characters';
    if (this.sfConfirmPassword.errors?.['passwordMismatch']) return 'Passwords do not match';
    return '';
  }
}
