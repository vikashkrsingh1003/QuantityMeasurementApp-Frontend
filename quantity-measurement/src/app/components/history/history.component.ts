import { Component, Input, OnInit, OnChanges, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { QuantityService } from '../../services/quantity.service';
import { HistoryRecord } from '../../models/quantity.models';
import { MeasurementApiType, MEASUREMENT_CONFIGS } from '../../config/unit.config';

interface HistoryItemDisplay extends HistoryRecord {
  operation_icon?: string;
  operation_label?: string;
  measurement_display?: string;
  relative_time?: string;
  is_success?: boolean;
}

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss']
})
export class HistoryComponent implements OnInit, OnChanges {
  @Input() currentOperation: string = 'compare';
  @Input() currentMeasurementType: MeasurementApiType = 'LengthUnit';

  private quantityService = inject(QuantityService);
  private router = inject(Router);

  historyItems = signal<HistoryRecord[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  selectedType = signal<MeasurementApiType>('LengthUnit');

  measurementTypes = MEASUREMENT_CONFIGS.map(c => ({ label: c.label, value: c.apiType }));

  // Computed signal for enhanced display items
  displayItems = computed<HistoryItemDisplay[]>(() => {
    const items = this.historyItems().map(item => ({
      ...item,
      // Map backend property names to standard properties for display
      value1: item.value1 ?? item.thisValue,
      unit1: item.unit1 ?? item.thisUnit,
      value2: item.value2 ?? item.thatValue,
      unit2: item.unit2 ?? item.thatUnit,
      measurementType: item.measurementType ?? item.thisMeasurementType,
      operation_icon: this.getOperationIcon(item.operation),
      operation_label: this.getOperationLabel(item.operation),
      measurement_display: this.getMeasurementDisplay(item.measurementType ?? item.thisMeasurementType),
      relative_time: this.getRelativeTime(item.createdAt ?? (item as any).creationDate ?? (item as any).created_at ?? (item as any).timestamp),
      is_success: this.isSuccess(item)
    }));

    // Show latest operations first (reverse order)
    return items.reverse();
  });

  ngOnInit(): void {
    this.selectedType.set(this.currentMeasurementType);
    this.load();
  }

  ngOnChanges(): void {
    this.selectedType.set(this.currentMeasurementType);
    this.load();
  }

  selectType(type: MeasurementApiType): void {
    this.selectedType.set(type);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.quantityService.getHistoryByType(this.selectedType()).subscribe({
      next: (items: HistoryRecord[]) => {
        console.log('History items loaded:', items);
        this.historyItems.set(items || []);
        this.isLoading.set(false);
      },
      error: (err: Error) => {
        console.error('Error loading history:', err);
        this.error.set(err.message);
        this.isLoading.set(false);
      }
    });
  }

  getOperationIcon(op?: string): string {
    const icons: Record<string, string> = {
      'add': '➕',
      'subtract': '➖',
      'divide': '➗',
      'multiply': '✖️',
      'compare': '⚖️',
      'convert': '🔄'
    };
    return icons[op?.toLowerCase() ?? ''] ?? '📊';
  }

  getOperationLabel(op?: string): string {
    const labels: Record<string, string> = {
      'add': 'Addition',
      'subtract': 'Subtraction',
      'divide': 'Division',
      'multiply': 'Multiplication',
      'compare': 'Comparison',
      'convert': 'Conversion'
    };
    return labels[op?.toLowerCase() ?? ''] ?? 'Operation';
  }

  getMeasurementDisplay(type?: string): string {
    if (!type) {
      console.warn('getMeasurementDisplay: No type provided');
      return 'Unknown';
    }

    console.log('getMeasurementDisplay: Looking up type:', type);

    // Try exact match on apiType
    let config = MEASUREMENT_CONFIGS.find(c => c.apiType === type);
    if (config) {
      console.log('Found via exact match:', config.label);
      return config.label;
    }

    // Try case-insensitive match on apiType
    config = MEASUREMENT_CONFIGS.find(c => c.apiType?.toLowerCase() === type?.toLowerCase());
    if (config) {
      console.log('Found via case-insensitive match:', config.label);
      return config.label;
    }

    // Remove "Unit" suffix and match by label
    // Example: "LengthUnit" → "Length" → match config with label "Length"
    if (type.endsWith('Unit')) {
      const cleanType = type.slice(0, -4);
      console.log('Trying cleaned type:', cleanType);
      config = MEASUREMENT_CONFIGS.find(c => c.label.toLowerCase() === cleanType.toLowerCase());
      if (config) {
        console.log('Found via suffix removal:', config.label);
        return config.label;
      }
    }

    // Last resort: return the cleaned type
    const display = type.endsWith('Unit') ? type.slice(0, -4) : type;
    console.warn('No config found for type, returning cleaned:', display);
    return display;
  }

  getOperationBadgeClass(op?: string): string {
    const map: Record<string, string> = {
      add: 'badge-add',
      subtract: 'badge-sub',
      divide: 'badge-div',
      multiply: 'badge-mul',
      compare: 'badge-cmp',
      convert: 'badge-cvt'
    };
    return map[op?.toLowerCase() ?? ''] ?? 'badge-default';
  }

  getOperatorSymbol(op?: string): string {
    const symbols: Record<string, string> = {
      'add': '+',
      'subtract': '−',
      'divide': '÷',
      'multiply': '×',
      'compare': '==',
    };
    return symbols[op?.toLowerCase() ?? ''] ?? '→';
  }

  isSuccess(item: HistoryRecord): boolean {
    return !item.errorMessage && (item.status?.toLowerCase() === 'success' || item.resultString != null || item.resultValue != null);
  }

  formatResult(item: HistoryRecord): string {
    // If there's an error, show it
    if (item.errorMessage) return item.errorMessage;

    // Try resultString first (best for display)
    if (item.resultString) {
      // Clean up boolean strings for better display
      if (item.resultString === 'true') return 'true';
      if (item.resultString === 'false') return 'false';
      return item.resultString;
    }

    // Fall back to resultValue if available
    if (item.resultValue != null) {
      return String(item.resultValue);
    }

    return '—';
  }

  /** For debugging: show raw item structure */
  getDebugInfo(item: HistoryRecord): string {
    return JSON.stringify({
      value1: item.value1,
      unit1: item.unit1,
      value2: item.value2,
      unit2: item.unit2,
      measurementType: item.measurementType,
      resultString: item.resultString,
      resultValue: item.resultValue
    }, null, 2);
  }

  getRelativeTime(createdAt?: string): string {
    if (!createdAt) {
      console.warn('getRelativeTime: No timestamp provided');
      return '—';
    }

    try {
      const date = new Date(createdAt);
      if (isNaN(date.getTime())) {
        console.warn('getRelativeTime: Invalid date format:', createdAt);
        return '—';
      }

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString();
    } catch (err) {
      console.error('getRelativeTime error:', err);
      return '—';
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
