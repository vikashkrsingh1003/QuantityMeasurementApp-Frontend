import { MeasurementApiType } from '../config/unit.config';

/**
 * Mirrors backend: com.app.quantitymeasurement.dto.response.QuantityDTO
 * Used for ALL three fields: thisQuantityDTO, thatQuantityDTO, targetUnitDTO
 *
 * Backend @NotNull constraints:
 *   @NotNull value
 *   @NotNull unit
 *   @NotNull measurementType
 *
 * IMPORTANT: targetUnitDTO also uses this same DTO — it needs value=0
 * when used purely as a "target unit carrier" (e.g. for convert).
 */
export interface QuantityDTO {
  value:           number;           // @NotNull — MUST always be a number, never null
  unit:            string;           // @NotNull — MUST always be a non-empty string
  measurementType: MeasurementApiType; // @NotNull — MUST always be set
}

/**
 * Mirrors backend: com.app.quantitymeasurement.dto.request.QuantityInputDTO
 *
 * @NotNull thisQuantityDTO  — always required
 * @NotNull thatQuantityDTO  — always required
 *          targetUnitDTO    — optional (null = use unit of thisQuantityDTO)
 */
export interface QuantityInputDTO {
  thisQuantityDTO: QuantityDTO;
  thatQuantityDTO: QuantityDTO;
  targetUnitDTO?:  QuantityDTO;   // optional — same DTO type as the others
}

/**
 * Mirrors backend response: QuantityMeasurementDTO
 * resultValue  — numeric result (arithmetic / convert)
 * resultString — string result (compare returns "true"/"false"; others get formatted string)
 */
export interface QuantityResponseDTO {
  resultValue:  number;
  resultString: string;
}

/** History record shape returned by GET /history/* endpoints */
export interface HistoryRecord {
  id?:                    number;
  operation?:             string;

  // Backend returns these names:
  thisValue?:             number;
  thisUnit?:              string;
  thatValue?:             number;
  thatUnit?:              string;
  thisMeasurementType?:   string;

  // For backwards compatibility / alternative format:
  measurementType?:       string;
  value1?:                number;
  unit1?:                 string;
  value2?:                number;
  unit2?:                 string;

  resultValue?:           number;
  resultString?:          string;
  status?:                string;
  errorMessage?:          string;
  createdAt?:             string;
}
