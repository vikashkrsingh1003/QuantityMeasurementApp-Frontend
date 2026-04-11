import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { QuantityService } from '../../services/quantity.service';
import { AuthService } from '../../services/auth.service';
import {
  MEASUREMENT_CONFIGS, MeasurementConfig, ArithmeticType, OperationType
} from '../../config/unit.config';
import { buildSafeRequest, OperationKey } from '../../utils/request-builder.util';
import { InputPanelComponent } from '../input-panel/input-panel.component';
import { ResultDisplayComponent } from '../result-display/result-display.component';

@Component({
  selector: 'app-measurement-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputPanelComponent, ResultDisplayComponent],
  templateUrl: './measurement-dashboard.component.html',
  styleUrls: ['./measurement-dashboard.component.scss']
})
export class MeasurementDashboardComponent implements OnInit {
  private fb              = inject(FormBuilder);
  private quantityService = inject(QuantityService);
  authService             = inject(AuthService);  // Make public for template
  private router          = inject(Router);

  readonly measurementConfigs = MEASUREMENT_CONFIGS;

  readonly arithmeticOps: { label: string; value: ArithmeticType; symbol: string }[] = [
    { label: 'Add',      value: 'add',      symbol: '+' },
    { label: 'Subtract', value: 'subtract', symbol: '−' },
    { label: 'Divide',   value: 'divide',   symbol: '÷' },
  ];

  // ── State signals ────────────────────────────────────────────────────────
  selectedMeasurement = signal<MeasurementConfig>(MEASUREMENT_CONFIGS[0]);
  selectedMainOp      = signal<'compare' | 'convert' | 'arithmetic'>('compare');
  selectedArithmetic  = signal<ArithmeticType>('add');
  isLoading           = signal(false);
  result              = signal<{ value?: number; text?: string; isString: boolean } | null>(null);
  errorMsg            = signal<string | null>(null);
  toastMsg            = signal<{ text: string; type: 'success' | 'error' } | null>(null);
  isLoggedIn = this.authService.isAuthenticated;
  showUserMenu = signal(false);

  // ── Computed ─────────────────────────────────────────────────────────────
  currentUnits = computed(() => this.selectedMeasurement().units);

  arithmeticOpsFiltered = computed(() =>
    this.selectedMeasurement().supportsArithmetic
      ? this.arithmeticOps
      : this.arithmeticOps.filter(o => o.value === 'divide')
  );

  isArithmeticDisabledForTemp = computed(() => !this.selectedMeasurement().supportsArithmetic);

  /** Hide Arithmetic tab completely when measurement doesn't support it (e.g. Temperature) */
  get hideArithmeticTab(): boolean { return !this.selectedMeasurement().supportsArithmetic; }

  operatorSymbol = computed(() => {
    const main = this.selectedMainOp();
    if (main === 'compare') return '==';
    if (main === 'convert') return '→';
    return this.arithmeticOps.find(o => o.value === this.selectedArithmetic())?.symbol ?? '+';
  });

  form!: FormGroup;

  ngOnInit(): void {
    // Refresh user from localStorage on init (important for OAuth flow)
    this.authService.refreshUserFromStorage();
    this.initForm();
  }

  initForm(): void {
    const units = this.currentUnits();
    this.form = this.fb.group({
      value1:     [null, [Validators.required, Validators.pattern(/^-?\d*\.?\d+$/)]],
      unit1:      [units[0]?.value ?? '', Validators.required],
      // value2 defaults 0 — no required validator; set/cleared by operation
      value2:     [0],
      unit2:      [units[1]?.value ?? units[0]?.value ?? '', Validators.required],
      resultUnit: [units[0]?.value ?? '', Validators.required],
    });
  }

  /**
   * Sync value2 validators with the active operation.
   * Convert → value2 = 0, no validator needed (backend ignores value).
   * Compare / Arithmetic → user must enter a real value.
   */
  private syncValue2Validators(): void {
    const ctrl = this.form.get('value2')!;
    if (this.isConvert) {
      ctrl.clearValidators();
      ctrl.setValue(0, { emitEvent: false });
    } else {
      ctrl.setValidators([Validators.required, Validators.pattern(/^-?\d*\.?\d+$/)]);
    }
    ctrl.updateValueAndValidity();
  }

  // ── User actions ─────────────────────────────────────────────────────────

  selectMeasurement(config: MeasurementConfig): void {
    this.selectedMeasurement.set(config);
    const units = config.units;
    this.form.patchValue({
      unit1:      units[0]?.value ?? '',
      unit2:      units[1]?.value ?? units[0]?.value ?? '',
      resultUnit: units[0]?.value ?? '',
    });
    // If Temperature selected while on Arithmetic tab → switch to Compare
    if (!config.supportsArithmetic && this.selectedMainOp() === 'arithmetic') {
      this.selectedMainOp.set('compare');
    }
    this.result.set(null);
    this.errorMsg.set(null);
  }

  selectMainOp(op: 'compare' | 'convert' | 'arithmetic'): void {
    this.selectedMainOp.set(op);
    this.result.set(null);
    this.errorMsg.set(null);
    this.syncValue2Validators();
  }

  selectArithmetic(op: ArithmeticType): void {
    if (!this.selectedMeasurement().supportsArithmetic && op !== 'divide') return;
    this.selectedArithmetic.set(op);
    this.result.set(null);
  }

  // ── Boolean convenience getters ──────────────────────────────────────────
  get isConvert():    boolean { return this.selectedMainOp() === 'convert'; }
  get isArithmetic(): boolean { return this.selectedMainOp() === 'arithmetic'; }
  get isCompare():    boolean { return this.selectedMainOp() === 'compare'; }
  /** Show result-unit selector for convert and arithmetic */
  get showResultUnit(): boolean { return !this.isCompare; }

  // ── Payload building ─────────────────────────────────────────────────────

  /** Returns the exact OperationKey sent to buildSafeRequest */
  get activeOperationKey(): OperationKey {
    if (this.isCompare)  return 'compare';
    if (this.isConvert)  return 'convert';
    return this.selectedArithmetic();
  }

  /**
   * Builds the request payload using buildSafeRequest.
   *
   * CONVERT: thatQuantityDTO carries the target unit (unit = resultUnit, value = 0).
   *          targetUnitDTO is NOT sent.
   * COMPARE: thatQuantityDTO carries real value2 + unit2.
   *          targetUnitDTO is NOT sent.
   * ADD/SUB: both operands carry real values; targetUnitDTO carries result unit.
   * DIVIDE:  both operands carry real values; targetUnitDTO NOT sent.
   */
  buildPayload() {
    const f = this.form.value;
    return buildSafeRequest({
      value1:          f.value1,
      unit1:           f.unit1,
      value2:          f.value2,
      unit2:           f.unit2,
      resultUnit:      f.resultUnit,
      measurementType: this.selectedMeasurement().apiType,
      operation:       this.activeOperationKey,
    });
  }

  getApiObservable(payload: ReturnType<typeof buildSafeRequest>) {
    switch (this.activeOperationKey) {
      case 'compare':  return this.quantityService.compare(payload);
      case 'convert':  return this.quantityService.convert(payload);
      case 'add':      return this.quantityService.add(payload);
      case 'subtract': return this.quantityService.subtract(payload);
      case 'divide':   return this.quantityService.divide(payload);
    }
  }

  calculate(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.isLoading.set(true);
    this.result.set(null);
    this.errorMsg.set(null);

    const payload = this.buildPayload();
    this.getApiObservable(payload).subscribe({
      next: res => {
        this.isLoading.set(false);
        this.result.set(
          this.isCompare
            ? { text: res.resultString, isString: true }
            : { value: res.resultValue, text: res.resultString, isString: false }
        );
        this.showToast('Calculation complete!', 'success');
      },
      error: (err: Error) => {
        this.isLoading.set(false);
        this.errorMsg.set(err.message);
        this.showToast(err.message, 'error');
      },
    });
  }

  // ── History ──────────────────────────────────────────────────────────────
  get currentApiOperation(): string { return this.activeOperationKey; }

  toggleHistory(): void {
    if (!this.authService.getToken()) { this.router.navigate(['/auth']); return; }
    this.router.navigate(['/history'], {
      queryParams: {
        operation: this.currentApiOperation,
        type: this.selectedMeasurement().apiType
      }
    });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  logout(): void {
    this.showToast('👋 Logged out successfully', 'success');
    setTimeout(() => {
      this.authService.logout();
    }, 500);
  }

  toggleUserMenu(): void { this.showUserMenu.set(!this.showUserMenu()); }
  closeUserMenu(): void { this.showUserMenu.set(false); }

  goToLogin():  void { this.router.navigate(['/auth']); }
  goToSignup(): void { this.router.navigate(['/auth'], { queryParams: { tab: 'signup' } }); }

  // ── Toast ─────────────────────────────────────────────────────────────────
  showToast(text: string, type: 'success' | 'error'): void {
    this.toastMsg.set({ text, type });
    setTimeout(() => this.toastMsg.set(null), 3500);
  }

  // ── Template-safe getters (no signal calls in templates) ─────────────────
  get toastText():      string  { return this.toastMsg()?.text ?? ''; }
  get toastType():      string  { return this.toastMsg()?.type ?? ''; }
  get hasToast():       boolean { return this.toastMsg() !== null; }
  get loggedIn():       boolean { return this.isLoggedIn(); }
  get userMenuOpen():   boolean { return this.showUserMenu(); }
}
