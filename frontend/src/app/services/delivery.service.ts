import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Delivery {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  products_count: number;
  total_amount: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  status_display: string;
  driver_name?: string;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  count?: number;
}

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    console.error('Une erreur est survenue:', error);
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Erreur ${error.status}: ${error.statusText}`;
    }
    
    return throwError(() => errorMessage);
  }

  getShippedDeliveries(): Observable<Delivery[]> {
    return this.http.get<ApiResponse<Delivery[]>>(`${this.apiUrl}/deliveries/shipped/`).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message);
        }
        return response.data || [];
      }),
      catchError(this.handleError)
    );
  }

  markAsDelivered(orderId: string): Observable<Delivery> {
    return this.http.patch<ApiResponse<Delivery>>(`${this.apiUrl}/deliveries/${orderId}/status/`, {
      status: 'delivered'
    }).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message);
        }
        return response.data!;
      }),
      catchError(this.handleError)
    );
  }

  cancelDelivery(orderId: string): Observable<Delivery> {
    return this.http.patch<ApiResponse<Delivery>>(`${this.apiUrl}/deliveries/${orderId}/status/`, {
      status: 'cancelled'
    }).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message);
        }
        return response.data!;
      }),
      catchError(this.handleError)
    );
  }

  getDeliveryStats(): Observable<any> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/deliveries/stats/`).pipe(
      map(response => {
        if (response.status === 'error') {
          throw new Error(response.message);
        }
        return response.data || { today: 0, inProgress: 0, completed: 0 };
      }),
      catchError(this.handleError)
    );
  }
} 