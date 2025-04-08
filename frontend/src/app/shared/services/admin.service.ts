import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Récupérer les statistiques d'administration
   */
  getAdmins(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admins`);
  }

  /**
   * Récupérer les statistiques de produits
   */
  getProducts(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/products/stats`);
  }

  /**
   * Récupérer les statistiques de commandes
   */
  getOrders(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/orders/stats`);
  }

  /**
   * Récupérer les statistiques d'utilisateurs
   */
  getUsers(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/users/stats`);
  }
} 