import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { UnitOption } from '../../config/unit.config';

@Component({
  selector: 'app-result-display',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './result-display.component.html',
  styleUrls: ['./result-display.component.scss']
})
export class ResultDisplayComponent {
  @Input() result: { value?: number; text?: string; isString: boolean } | null = null;
  @Input() isLoading = false;
  @Input() errorMessage: string | null = null;
  @Input() showResultUnit = false;
  @Input() units: UnitOption[] = [];
  @Input() form!: FormGroup;

  get displayValue(): string {
    if (!this.result) return '—';
    if (this.result.isString) return this.result.text ?? '—';
    return this.result.value !== undefined ? String(this.result.value) : '—';
  }
  get isBoolean(): boolean { return this.result?.isString === true; }
  get boolResult(): boolean | null {
    if (!this.result?.text) return null;
    const t = this.result.text.toLowerCase();
    if (t === 'true') return true;
    if (t === 'false') return false;
    return null;
  }
}
