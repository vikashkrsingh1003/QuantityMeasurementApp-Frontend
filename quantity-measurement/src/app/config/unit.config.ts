/**
 * CENTRALIZED UNIT CONFIGURATION
 * All unit values MUST exactly match backend enum names (case-sensitive).
 * measurementType strings MUST exactly match backend class names.
 */

export type MeasurementApiType = 'LengthUnit' | 'WeightUnit' | 'TemperatureUnit' | 'VolumeUnit';
export type OperationType  = 'compare' | 'convert' | 'add' | 'subtract' | 'divide';
export type ArithmeticType = 'add' | 'subtract' | 'divide';
export type MeasurementLabel = 'Length' | 'Weight' | 'Temperature' | 'Volume';

export interface UnitOption {
  label: string;   // Display label in dropdown
  value: string;   // EXACT backend enum string
}

export interface MeasurementConfig {
  label:             MeasurementLabel;
  icon:              string;
  apiType:           MeasurementApiType;
  units:             UnitOption[];
  supportsArithmetic: boolean; // Temperature does NOT support Add/Subtract
}

// ─── Exact backend enum values ─────────────────────────────────────────────
export const UNIT_CONFIG: Record<MeasurementApiType, string[]> = {
  LengthUnit:      ['FEET', 'INCHES', 'YARDS', 'CENTIMETERS'],
  WeightUnit:      ['KILOGRAM', 'GRAM', 'POUND'],
  TemperatureUnit: ['CELSIUS', 'FAHRENHEIT', 'KELVIN'],
  VolumeUnit:      ['LITRE', 'MILLILITRE', 'GALLON'],
};

// ─── Human-readable labels ─────────────────────────────────────────────────
export const UNIT_LABELS: Record<string, string> = {
  // Length
  FEET: 'Feet', INCHES: 'Inches', YARDS: 'Yards', CENTIMETERS: 'Centimeters',
  // Weight
  KILOGRAM: 'Kilogram', GRAM: 'Gram', POUND: 'Pound',
  // Temperature
  CELSIUS: 'Celsius', FAHRENHEIT: 'Fahrenheit', KELVIN: 'Kelvin',
  // Volume
  LITRE: 'Litre', MILLILITRE: 'Millilitre', GALLON: 'Gallon',
};

// ─── Full measurement type configs ────────────────────────────────────────
export const MEASUREMENT_CONFIGS: MeasurementConfig[] = [
  {
    label: 'Length',
    icon:  '📏',
    apiType: 'LengthUnit',
    supportsArithmetic: true,
    units: UNIT_CONFIG['LengthUnit'].map(v => ({ label: UNIT_LABELS[v], value: v })),
  },
  {
    label: 'Weight',
    icon:  '⚖️',
    apiType: 'WeightUnit',
    supportsArithmetic: true,   // Weight supports ALL operations
    units: UNIT_CONFIG['WeightUnit'].map(v => ({ label: UNIT_LABELS[v], value: v })),
  },
  {
    label: 'Temperature',
    icon:  '🌡️',
    apiType: 'TemperatureUnit',
    supportsArithmetic: false,  // ⛔ No Add/Subtract for Temperature
    units: UNIT_CONFIG['TemperatureUnit'].map(v => ({ label: UNIT_LABELS[v], value: v })),
  },
  {
    label: 'Volume',
    icon:  '🧪',
    apiType: 'VolumeUnit',
    supportsArithmetic: true,
    units: UNIT_CONFIG['VolumeUnit'].map(v => ({ label: UNIT_LABELS[v], value: v })),
  },
];
