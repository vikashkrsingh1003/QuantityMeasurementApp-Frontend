import { MeasurementApiType } from '../config/unit.config';
import { QuantityDTO, QuantityInputDTO } from '../models/quantity.models';

/**
 * Safely converts any value to a finite number.
 * null / undefined / NaN / '' → 0
 */
export function safeNumber(val: unknown): number {
  const n = Number(val);
  return isFinite(n) ? n : 0;
}

/**
 * Builds one QuantityDTO ensuring no null/undefined fields.
 * Backend @NotNull constraint requires ALL three fields present.
 */
function makeDTO(
  value:           unknown,
  unit:            unknown,
  measurementType: MeasurementApiType
): QuantityDTO {
  return {
    value:           safeNumber(value),          // never null — default 0
    unit:            String(unit || '').trim(),   // never null — trimmed string
    measurementType: measurementType,             // never null — always set
  };
}

export interface BuildRequestOptions {
  value1:          unknown;
  unit1:           unknown;
  value2:          unknown;
  unit2:           unknown;
  resultUnit:      unknown;           // target unit for convert / arithmetic result
  measurementType: MeasurementApiType;
  operation:       OperationKey;
}

export type OperationKey = 'compare' | 'convert' | 'add' | 'subtract' | 'divide';

/**
 * SAFE REQUEST BUILDER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backend rules (from QuantityInputDTO + controller Javadoc):
 *
 *  COMPARE   → thisQty + thatQty required; NO targetUnitDTO
 *  CONVERT   → thisQty (source) + thatQty (target unit carrier, value=0);
 *               targetUnitDTO optional but we omit it to avoid confusion.
 *               Backend uses thatQuantityDTO.unit as the target unit.
 *  ADD/SUB   → thisQty + thatQty + optional targetUnitDTO
 *  DIVIDE    → thisQty + thatQty; NO targetUnitDTO (returns dimensionless ratio)
 *
 * All QuantityDTOs MUST have value (number), unit (string), measurementType.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function buildSafeRequest(opts: BuildRequestOptions): QuantityInputDTO {
  const { value1, unit1, value2, unit2, resultUnit, measurementType, operation } = opts;

  // ── thisQuantityDTO: always the user's first input ──────────────────────
  const thisDTO = makeDTO(value1, unit1, measurementType);

  // ── thatQuantityDTO ──────────────────────────────────────────────────────
  // CONVERT: backend reads thatQuantityDTO.unit as the target unit.
  //          value must not be null → send 0.
  // COMPARE/ARITHMETIC: send actual value2 with its unit.
  const thatDTO = makeDTO(
    operation === 'convert' ? 0 : value2,
    operation === 'convert' ? resultUnit : unit2,  // for convert: unit2 is target unit
    measurementType
  );

  const payload: QuantityInputDTO = {
    thisQuantityDTO: thisDTO,
    thatQuantityDTO: thatDTO,
  };

  // ── targetUnitDTO ────────────────────────────────────────────────────────
  // ADD / SUBTRACT: include targetUnitDTO so result is in chosen unit.
  //   value must satisfy @NotNull → send 0.
  // COMPARE / DIVIDE / CONVERT: omit entirely (backend handles without it).
  if (operation === 'add' || operation === 'subtract') {
    payload.targetUnitDTO = makeDTO(0, resultUnit || unit1, measurementType);
  }

  // ── Debug logging ────────────────────────────────────────────────────────
  console.group(`[QM] buildSafeRequest → ${operation.toUpperCase()}`);
  console.log('Payload JSON:', JSON.stringify(payload, null, 2));

  const issues: string[] = [];
  if (!payload.thisQuantityDTO.unit)  issues.push('thisQuantityDTO.unit is empty');
  if (!payload.thatQuantityDTO.unit)  issues.push('thatQuantityDTO.unit is empty');
  if (payload.targetUnitDTO && !payload.targetUnitDTO.unit) issues.push('targetUnitDTO.unit is empty');

  if (issues.length) console.warn('[QM] ⚠️ Payload warnings:', issues);
  else               console.log('[QM] ✅ All fields present and valid');
  console.groupEnd();

  return payload;
}
