import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { QuantityInputDTO, QuantityResponseDTO, HistoryRecord } from '../models/quantity.models';

@Injectable({ providedIn: 'root' })
export class QuantityService {
  private readonly http = inject(HttpClient);
  private readonly BASE = 'http://localhost:8080/api/v1/quantities';

  compare(payload: QuantityInputDTO): Observable<QuantityResponseDTO> {
    return this.http.post<QuantityResponseDTO>(`${this.BASE}/compare`, payload)
      .pipe(catchError(this.handle));
  }

  convert(payload: QuantityInputDTO): Observable<QuantityResponseDTO> {
    return this.http.post<QuantityResponseDTO>(`${this.BASE}/convert`, payload)
      .pipe(catchError(this.handle));
  }

  add(payload: QuantityInputDTO): Observable<QuantityResponseDTO> {
    return this.http.post<QuantityResponseDTO>(`${this.BASE}/add`, payload)
      .pipe(catchError(this.handle));
  }

  subtract(payload: QuantityInputDTO): Observable<QuantityResponseDTO> {
    return this.http.post<QuantityResponseDTO>(`${this.BASE}/subtract`, payload)
      .pipe(catchError(this.handle));
  }

  divide(payload: QuantityInputDTO): Observable<QuantityResponseDTO> {
    return this.http.post<QuantityResponseDTO>(`${this.BASE}/divide`, payload)
      .pipe(catchError(this.handle));
  }

  /** GET /history/operation/{operation} */
  getHistoryByOperation(operation: string): Observable<HistoryRecord[]> {
    return this.http.get<HistoryRecord[]>(`${this.BASE}/history/operation/${operation}`)
      .pipe(catchError(this.handle));
  }

  /** GET /history/type/{measurementType} */
  getHistoryByType(type: string): Observable<HistoryRecord[]> {
    return this.http.get<HistoryRecord[]>(`${this.BASE}/history/type/${type}`)
      .pipe(catchError(this.handle));
  }

  /** GET /history/errored */
  getErroredHistory(): Observable<HistoryRecord[]> {
    return this.http.get<HistoryRecord[]>(`${this.BASE}/history/errored`)
      .pipe(catchError(this.handle));
  }

  /** GET /count/{operation} */
  getCount(operation: string): Observable<number> {
    return this.http.get<number>(`${this.BASE}/count/${operation}`)
      .pipe(catchError(this.handle));
  }

  private handle(error: HttpErrorResponse): Observable<never> {
    // Extract the most useful message from Spring's error response
    const msg =
      error.error?.message ||
      error.error?.error  ||
      (Array.isArray(error.error?.errors) ? error.error.errors[0]?.defaultMessage : null) ||
      `Error ${error.status}: ${error.statusText}`;
    return throwError(() => new Error(msg));
  }
}
