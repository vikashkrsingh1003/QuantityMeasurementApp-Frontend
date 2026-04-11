import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { UnitOption } from '../../config/unit.config';

@Component({
  selector: 'app-input-panel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './input-panel.component.html',
  styleUrls: ['./input-panel.component.scss']
})
export class InputPanelComponent {
  @Input() label!: string;
  @Input() valueControlName!: string;
  @Input() unitControlName!: string;
  @Input() form!: FormGroup;
  @Input() units: UnitOption[] = [];

  get valueControl() { return this.form.get(this.valueControlName); }
  get unitControl()  { return this.form.get(this.unitControlName); }
  get hasValueError() { return this.valueControl?.invalid && this.valueControl?.touched; }
}
