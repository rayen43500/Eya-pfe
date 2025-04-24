import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, forkJoin, of } from 'rxjs';
import { catchError, tap, switchMap, map, delay, take } from 'rxjs/operators';
import { Product } from './product.service';
import { AuthService } from './auth.service';
import { AuthClientService } from './auth-client.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
  product_image?: string;
}

export interface ShippingAddress {
  id: number;
  full_name?: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone?: string;
}

export interface Order {
  id: number;
  client: number;
  client_info?: {
    id: number;
    username: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
  total_amount: number;
  discount_amount: number;
  status: string;
  status_display: string;
  total_products: number;
  items: OrderItem[];
  shipping_address?: ShippingAddress;
  livreur?: {
    id: number;
    username: string;
    email: string;
  };
  delivery_code?: string;
  is_code_validated: boolean;
  tracking_number?: string;
  estimated_delivery_date?: string;
  assigned_at?: string;
  delivered_at?: string;
}

export interface CreateOrderRequest {
  items: {
    product_id: number;
    quantity: number;
  }[];
  shipping_address_id?: number;
  shipping_address?: {
    full_name: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
    phone: string;
  };
  promotion_code?: string;
  payment_method?: string;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  total_revenue: number;
  average_order_value: number;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = 'http://localhost:8000/api/orders/';
  private devMode = false;
  
  constructor(
    private http: HttpClient, 
    private authService: AuthService,
    private authClientService: AuthClientService
  ) {
    console.log('OrderService initialisé avec URL:', this.apiUrl);
  }
  
  // Méthode pour obtenir les en-têtes d'authentification
  private getAuthHeaders(): HttpHeaders {
    // En mode invité, ne pas envoyer de token d'authentification
    if (this.authClientService.isGuestMode()) {
      console.log('OrderService - Mode invité: aucun token d\'authentification envoyé');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    // Mode authentifié, envoyer le token
    const token = this.authClientService.getClientToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }
  
  // Obtenir toutes les commandes
  getOrders(status?: OrderStatus): Observable<Order[]> {
    let url = this.apiUrl;
    if (status) {
      url = `${url}?status=${status}`;
    }
    
    const headers = this.getAuthHeaders();
    return this.http.get<Order[]>(url, { headers }).pipe(
      tap(orders => console.log('Commandes récupérées:', orders.length)),
      catchError(this.handleError)
    );
  }
  
  // Obtenir les commandes d'un client
  getClientOrders(): Observable<Order[]> {
    return this.authService.currentUser.pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          console.error('Aucun utilisateur connecté');
          return of([]);
        }

        const clientId = currentUser.id;
        console.log('Récupération des commandes pour le client:', clientId);

        const headers = this.getAuthHeaders();
        return this.http.get<Order[]>(`${this.apiUrl}?client=${clientId}`, { headers }).pipe(
          tap(orders => console.log('Commandes client récupérées:', orders.length)),
          catchError(error => {
            console.error('Erreur lors de la récupération des commandes:', error);
            return of([]);  // Retourner un tableau vide en cas d'erreur
          })
        );
      })
    );
  }
  
  // Obtenir les détails d'une commande
  getOrderDetails(orderId: number): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.get<Order>(`${this.apiUrl}/${orderId}`, { headers }).pipe(
      tap(order => console.log('Détails de la commande récupérés:', order.id)),
      catchError(this.handleError)
    );
  }
  
  // Créer une nouvelle commande
  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.post<Order>(this.apiUrl, orderData, { headers }).pipe(
      tap(response => console.log('Commande créée:', response)),
      catchError(this.handleError)
    );
  }
  
  // Mettre à jour le statut d'une commande
  updateOrderStatus(orderId: number, status: string): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.patch<Order>(`${this.apiUrl}${orderId}/update_status/`, { status }, { headers }).pipe(
      tap(order => console.log(`Statut de la commande ${orderId} mis à jour à ${status}`)),
      catchError(this.handleError)
    );
  }
  
  // Supprimer une commande
  deleteOrder(orderId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/${orderId}/`, { headers }).pipe(
      tap(() => console.log('Commande supprimée:', orderId)),
      catchError(this.handleError)
    );
  }

  // Obtenir les commandes en attente pour un livreur
  getPendingDeliveries(): Observable<Order[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Order[]>(`${this.apiUrl}?status=shipped&livreur__isnull=true`, { headers }).pipe(
      tap(orders => console.log('Livraisons en attente récupérées:', orders.length)),
      catchError(error => {
        console.error('Erreur lors de la récupération des livraisons en attente:', error);
        return of([]);  // Retourner un tableau vide en cas d'erreur
      })
    );
  }

  // Obtenir les commandes assignées à un livreur
  getAssignedDeliveries(): Observable<Order[]> {
    return this.authService.currentUser.pipe(
      switchMap(currentUser => {
        if (!currentUser) {
          console.error('Aucun utilisateur connecté');
          return of([]);
        }

        const livreurId = currentUser.id;
        console.log('Récupération des livraisons assignées pour le livreur:', livreurId);

        const headers = this.getAuthHeaders();
        return this.http.get<Order[]>(`${this.apiUrl}?status=shipped&livreur=${livreurId}`, { headers }).pipe(
          tap(orders => console.log('Livraisons assignées récupérées:', orders.length)),
          catchError(error => {
            console.error('Erreur lors de la récupération des livraisons assignées:', error);
            return of([]);  // Retourner un tableau vide en cas d'erreur
          })
        );
      })
    );
  }

  // Valider une livraison
  validateDelivery(orderId: number, deliveryCode: string): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.post<Order>(`${this.apiUrl}/validate/${orderId}/`, { delivery_code: deliveryCode }, { headers }).pipe(
      tap(order => console.log(`Livraison ${orderId} validée avec le code`)),
      catchError(this.handleError)
    );
  }

  // Assigner un livreur à une commande
  assignLivreur(orderId: number, livreurId: number): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.post<Order>(`${this.apiUrl}/assign/${orderId}/`, { livreur_id: livreurId }, { headers }).pipe(
      tap(order => console.log(`Livreur ${livreurId} assigné à la commande ${orderId}`)),
      catchError(this.handleError)
    );
  }

  // Appliquer un code promo à une commande
  applyPromoCode(orderId: number, promoCode: string): Observable<Order> {
    const headers = this.getAuthHeaders();
    return this.http.post<Order>(`${this.apiUrl}/${orderId}/apply_promo/`, { promo_code: promoCode }, { headers }).pipe(
      tap(order => console.log(`Code promo appliqué à la commande ${orderId}`)),
      catchError(this.handleError)
    );
  }

  // Générer un code de livraison unique
  private generateDeliveryCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // Générer des données de test
  private generateMockOrders(): Order[] {
    const mockOrders: Order[] = [];
    const statuses: OrderStatus[] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    
    for (let i = 1; i <= 10; i++) {
      const order: Order = {
        id: i,
        client: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        total_amount: Math.random() * 1000,
        discount_amount: Math.random() * 100,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        status_display: statuses[Math.floor(Math.random() * statuses.length)],
        total_products: Math.floor(Math.random() * 5) + 1,
        items: [],
        is_code_validated: Math.random() > 0.5,
        delivery_code: this.generateDeliveryCode()
      };
      mockOrders.push(order);
    }
    
    return mockOrders;
  }

  // Obtenir toutes les commandes (pour admin)
  getAllOrders(status?: OrderStatus): Observable<Order[]> {
    if (this.devMode) {
      return of(this.generateMockOrders()).pipe(
        delay(800), // Simuler un délai réseau
        take(1)
      );
    }
    
    let url = this.apiUrl;
    if (status) {
      url += `?status=${status}`;
    }
    
    const headers = this.getAuthHeaders();
    return this.http.get<Order[]>(url, { headers }).pipe(
      catchError((error) => {
        console.error('Erreur lors de la récupération des commandes', error);
        return of([]);
      })
    );
  }

  // Mettre à jour une commande
  updateOrder(orderId: number, updateData: any): Observable<Order> {
    if (this.devMode) {
      console.log('Mode développement: simulation de mise à jour de commande');
      return of({...this.generateMockOrders()[0], ...updateData}).pipe(
        delay(800)
      );
    }
    
    const headers = this.getAuthHeaders();
    return this.http.patch<Order>(`${this.apiUrl}${orderId}/`, updateData, { headers }).pipe(
      tap(updatedOrder => console.log('Commande mise à jour:', updatedOrder)),
      catchError(this.handleError)
    );
  }

  // Gestionnaire d'erreurs générique
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Une erreur est survenue:', error);
    return throwError(() => new Error('Une erreur est survenue lors de l\'opération'));
  }
}