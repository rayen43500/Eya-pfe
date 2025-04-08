import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Promotion {
  id: number;
  code: string;
  description: string;
  details: string;
  type: string;
  type_display: string;
  value: number;
  value_display: string;
  start_date: string;
  end_date: string;
  period_display: string;
  usage_limit: number;
  usage_count: number;
  usage_display: string;
  status: string;
  status_display: string;
  created_at: string;
  updated_at: string;
}

export interface PromotionStats {
  total: number;
  active: number;
  scheduled: number;
  expired: number;
}

export interface CodeGenerationResponse {
  code: string;
}

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  private apiUrl = 'http://localhost:8000/api/promotions-direct/promotions/';

  constructor(private http: HttpClient) { }

  getPromotions(params?: any): Observable<Promotion[]> {
    return this.http.get<Promotion[]>(this.apiUrl, { params });
  }

  getPromotionById(id: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.apiUrl}${id}/`);
  }

  createPromotion(promotion: Partial<Promotion>): Observable<Promotion> {
    console.log('Envoi de la promotion:', promotion);
    
    // Afficher les en-têtes qui seront envoyés (hors intercepteur)
    console.log('Headers par défaut:', {
      'Content-Type': 'application/json',
    });
    
    // Vous pouvez également ajouter explicitement des en-têtes ici pour tester
    return this.http.post<Promotion>(this.apiUrl, promotion, {
      headers: {
        'Content-Type': 'application/json',
        // N'ajoutez PAS l'en-tête Authorization ici si vous utilisez l'intercepteur
      }
    });
  }

  updatePromotion(id: number, promotion: Partial<Promotion>): Observable<Promotion> {
    return this.http.patch<Promotion>(`${this.apiUrl}${id}/`, promotion);
  }

  deletePromotion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}${id}/`);
  }

  activatePromotion(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/activate/`, {});
  }

  deactivatePromotion(id: number): Observable<any> {
    return this.http.post(`${this.apiUrl}${id}/deactivate/`, {});
  }

  getPromotionStats(): Observable<PromotionStats> {
    return this.http.get<PromotionStats>(`${this.apiUrl}stats/`);
  }
  
  // Méthode pour récupérer les statistiques d'une promotion spécifique
  getPromotionUsageStats(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}${id}/usage_stats/`);
  }
  
  // Méthode manquante pour générer un code de promotion
  generatePromotionCode(prefix: string): Observable<CodeGenerationResponse> {
    return this.http.post<CodeGenerationResponse>(`${this.apiUrl}generate_code/`, { prefix });
  }
  
  // Méthode pour assigner une promotion à des utilisateurs
  assignPromotionToUsers(id: number, userIds: number[]): Observable<{status: string, assigned_count: number}> {
    return this.http.post<{status: string, assigned_count: number}>(`${this.apiUrl}${id}/assign_to_users/`, { user_ids: userIds });
  }
} 