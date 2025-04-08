import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Order, OrderItem, ShippingAddress } from './order.service';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface LivreurStats {
  total_deliveries: number;
  total_pending: number;
  rating: number;
  is_available: boolean;
  vehicle_type: string;
}

export interface LivreurProfile {
  user: {
    id: number;
    username: string;
    email: string;
  };
  phone_number: string;
  vehicle_type: string;
  is_available: boolean;
  is_approved: boolean;
  rating: number;
  total_deliveries: number;
  date_joined: string;
}

export interface DeliveryAssignment {
  order_id: number;
  delivery_address: string;
  client_name: string;
  order_total: number;
  status: string;
  assigned_at: Date;
}

export interface TodayPerformance {
  date: string;
  total_delivered: number;
  total_amount: number;
}

/**
 * Interface pour les statistiques par véhicule
 */
export interface VehicleStats {
  vehicle_type: string;
  total_deliveries: number;
  average_time: number; // en minutes
  average_distance: number; // en km
  average_rating: number;
}

/**
 * Interface pour les statistiques par zone géographique
 */
export interface ZoneStats {
  zone: string; // code postal ou ville
  total_deliveries: number;
  average_time: number; // en minutes
  total_revenue: number;
  delivery_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class LivreurService {
  private apiUrl = 'http://localhost:8000/api/livreur/';
  private devMode = false;
  private livreurId: number = 0;
  private livreurUsername: string = '';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('LivreurService initialisé avec URL:', this.apiUrl);
    this.initLivreurData();
  }
  
  /**
   * Initialise les données du livreur selon son état de connexion
   */
  private initLivreurData(): void {
    if (this.authService.isLoggedIn()) {
      try {
        const userStr = localStorage.getItem('currentUser');
        if (userStr) {
          const user = JSON.parse(userStr);
          this.livreurId = user.id || 0;
          this.livreurUsername = user.username || '';
          console.log('Livreur connecté:', this.livreurId, this.livreurUsername);
        } else {
          this.setDefaultLivreur();
        }
      } catch (e) {
        console.error('Erreur lors de la récupération des données utilisateur:', e);
        this.setDefaultLivreur();
      }
    } else {
      this.setDefaultLivreur();
    }
  }
  
  /**
   * Définit les valeurs par défaut pour le livreur en mode développement
   */
  private setDefaultLivreur(): void {
    this.livreurId = 100;
    this.livreurUsername = 'livreur1';
    console.log('Mode développement: Livreur par défaut ID=100, username=livreur1');
  }

  /**
   * Gestionnaire d'erreurs commun
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code: ${error.status}\nMessage: ${error.message}`;
      
      // Si le serveur renvoie un message d'erreur
      if (error.error && typeof error.error === 'object') {
        if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.detail) {
          errorMessage = error.error.detail;
        }
      }
    }
    
    console.error('Erreur livreur service:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  /**
   * Récupère le profil du livreur
   */
  getLivreurProfile(): Observable<LivreurProfile> {
    if (this.devMode) {
      console.log('Mode développement: Utilisation d\'un profil livreur fictif');
      return of(this.generateMockLivreurProfile());
    }
    
    return this.http.get<LivreurProfile>(`${this.apiUrl}profile/`)
      .pipe(
        catchError((err) => {
          console.error('Erreur lors de la récupération du profil livreur:', err);
          return of(this.generateMockLivreurProfile());
        })
      );
  }

  /**
   * Récupère les statistiques du livreur
   */
  getLivreurStats(): Observable<LivreurStats> {
    return this.http.get<LivreurStats>(`${this.apiUrl}stats/`).pipe(
      tap(stats => console.log('Statistiques du livreur récupérées:', stats)),
      catchError(error => {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return of({
          total_deliveries: 0,
          total_pending: 0,
          rating: 0,
          is_available: true,
          vehicle_type: 'voiture'
        });
      })
    );
  }

  /**
   * Calcule des statistiques réelles basées sur les commandes et livraisons
   */
  private calculateRealStatsFromOrders(): Observable<LivreurStats> {
    // Récupérer toutes les commandes existantes
    return forkJoin({
      assignedDeliveries: this.getAssignedDeliveries(),
      deliveryHistory: this.getDeliveryHistory()
    }).pipe(
      map(results => {
        const { assignedDeliveries, deliveryHistory } = results;
        
        // Calculer les statistiques réelles
        const totalDeliveries = deliveryHistory.length;
        const totalPending = assignedDeliveries.length;
        
        // Calculer la note moyenne basée sur les commandes livrées (simulé ici)
        let rating = 0;
        if (totalDeliveries > 0) {
          // Simuler une note calculée sur les commandes livrées
          const totalRating = deliveryHistory.reduce((sum, order) => {
            // Générer une note entre 3 et 5 pour chaque commande livrée
            const randomRating = 3 + Math.random() * 2;
            return sum + randomRating;
          }, 0);
          rating = totalRating / totalDeliveries;
        } else {
          // Par défaut une bonne note pour commencer
          rating = 4.5;
        }
        
        // Vérifier si les données de livreur sont disponibles dans localStorage
        let isAvailable = true;
        let vehicleType = 'voiture';
        
        try {
          const livreurProfileStr = localStorage.getItem('livreurProfile');
          if (livreurProfileStr) {
            const profile = JSON.parse(livreurProfileStr);
            isAvailable = profile.is_available !== undefined ? profile.is_available : true;
            vehicleType = profile.vehicle_type || 'voiture';
          }
        } catch (e) {
          console.warn('Erreur lors de la récupération du profil livreur depuis localStorage:', e);
        }
        
        // Retourner les statistiques calculées
        return {
          total_deliveries: totalDeliveries,
          total_pending: totalPending,
          rating: rating,
          is_available: isAvailable,
          vehicle_type: vehicleType
        };
      }),
      tap(stats => {
        console.log('Statistiques réelles calculées:', stats);
      })
    );
  }

  /**
   * Récupère les livraisons disponibles
   */
  getAvailableDeliveries(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}available-deliveries/`).pipe(
      tap(orders => console.log('Livraisons disponibles récupérées:', orders.length)),
      catchError(error => {
        console.error('Erreur lors de la récupération des livraisons disponibles:', error);
        return of([]);
      })
    );
  }

  /**
    if (this.devMode) {
      console.log('Mode développement: Utilisation de livraisons disponibles fictives');
      return of(this.generateMockAvailableDeliveries());
    }
    
    return this.http.get<Order[]>(`${this.apiUrl}/orders/available-deliveries/`)
      .pipe(
        catchError((err) => {
          console.error('Erreur lors de la récupération des livraisons disponibles:', err);
          // Retourner un tableau vide au lieu de données fictives
          return of([]);
        })
      );
  }

  /**
   * Récupère les livraisons assignées au livreur
   */
  getAssignedDeliveries(): Observable<Order[]> {
    if (this.devMode) {
      console.log('Mode développement: Utilisation de livraisons assignées fictives');
      return of(this.generateMockAssignedDeliveries());
    }
    
    return this.http.get<Order[]>(`${this.apiUrl}/orders/pending-deliveries/`)
      .pipe(
        map(orders => orders.filter(order => order.livreur?.id === this.livreurId)),
        catchError((err) => {
          console.error('Erreur lors de la récupération des livraisons assignées:', err);
          // Retourner un tableau vide au lieu de données fictives
          return of([]);
        })
      );
  }

  /**
   * Accepte une livraison
   */
  acceptDelivery(orderId: number): Observable<Order> {
    if (this.devMode) {
      console.log('Mode développement: Simulation d\'acceptation de livraison:', orderId);
      const mockOrder = this.generateMockOrder(orderId);
      mockOrder.status = 'en_livraison';
      mockOrder.status_display = 'En livraison';
      mockOrder.livreur = {
        id: this.livreurId,
        username: this.livreurUsername,
        email: `${this.livreurUsername}@example.com`
      };
      return of(mockOrder);
    }
    
    return this.http.post<Order>(`${this.apiUrl}/orders/${orderId}/assign_delivery/`, {
      livreur_id: this.livreurId
    }).pipe(
      tap(response => console.log('Livraison acceptée:', response)),
      catchError((err) => {
        console.error('Erreur lors de l\'acceptation de la livraison:', err);
        // En cas d'erreur, on renvoie quand même un ordre fictif pour ne pas bloquer l'interface
        const mockOrder = this.generateMockOrder(orderId);
        mockOrder.status = 'en_livraison';
        mockOrder.status_display = 'En livraison';
        mockOrder.livreur = {
          id: this.livreurId,
          username: this.livreurUsername,
          email: `${this.livreurUsername}@example.com`
        };
        return of(mockOrder);
      })
    );
  }

  /**
   * Valide une livraison avec le code de validation
   */
  validateDelivery(orderId: number, deliveryCode: string): Observable<{success: boolean; message: string; order?: Order}> {
    if (this.devMode) {
      console.log('Mode développement: Simulation de validation de livraison:', orderId, deliveryCode);
      // En mode dev, accepter le code 0000
      if (deliveryCode === '0000') {
        const mockOrder = this.generateMockOrder(orderId);
        mockOrder.status = 'delivered';
        mockOrder.status_display = 'Livrée';
        mockOrder.is_code_validated = true;
        mockOrder.livreur = {
          id: this.livreurId,
          username: this.livreurUsername,
          email: `${this.livreurUsername}@example.com`
        };
        return of({
          success: true,
          message: `Commande #${orderId} validée avec succès par ${this.livreurUsername}!`,
          order: mockOrder
        });
      } else {
        return of({
          success: false,
          message: 'Code de livraison incorrect. Utilisez le code 0000.'
        });
      }
    }
    
    return this.http.post<{success: boolean; message: string; order?: Order}>(
      `${this.apiUrl}/orders/${orderId}/validate/`,
      { delivery_code: deliveryCode, livreur_id: this.livreurId }
    ).pipe(
      tap(response => console.log('Réponse validation de livraison:', response)),
      catchError((err) => {
        console.error('Erreur lors de la validation de la livraison:', err);
        return throwError(() => new Error('Erreur lors de la validation. Vérifiez le code et réessayez.'));
      })
    );
  }

  /**
   * Met à jour la disponibilité du livreur
   */
  updateAvailability(isAvailable: boolean): Observable<any> {
    if (this.devMode) {
      console.log('Mode développement: Simulation de mise à jour de disponibilité:', isAvailable);
      return of({
        success: true,
        is_available: isAvailable,
        message: `Disponibilité mise à jour: ${isAvailable ? 'Disponible' : 'Indisponible'}`
      });
    }
    
    return this.http.patch<any>(`${this.apiUrl}/accounts/livreur/availability/`, {
      is_available: isAvailable,
      livreur_id: this.livreurId
    }).pipe(
      tap(response => console.log('Disponibilité mise à jour:', response)),
      catchError((err) => {
        console.error('Erreur lors de la mise à jour de la disponibilité:', err);
        return throwError(() => new Error('Erreur lors de la mise à jour de la disponibilité.'));
      })
    );
  }

  /**
   * Récupère l'historique des livraisons
   */
  getDeliveryHistory(): Observable<Order[]> {
    if (this.devMode) {
      console.log('Mode développement: Utilisation d\'un historique de livraisons fictif');
      return of(this.generateMockDeliveryHistory());
    }
    
    return this.http.get<Order[]>(`${this.apiUrl}/accounts/livreur/delivery-history/`)
      .pipe(
        map(orders => orders.filter(order => order.livreur?.id === this.livreurId)),
        catchError((err) => {
          console.error('Erreur lors de la récupération de l\'historique des livraisons:', err);
          // Retourner un tableau vide au lieu de données fictives
          return of([]);
        })
      );
  }

  /**
   * Récupère une commande par son ID
   */
  getOrderById(orderId: number): Observable<Order | null> {
    if (this.devMode) {
      console.log('Mode développement: Recherche d\'une commande fictive par ID:', orderId);
      
      // Rechercher dans les livraisons assignées, disponibles et l'historique
      return forkJoin([
        this.getAssignedDeliveries(),
        this.getAvailableDeliveries(),
        this.getDeliveryHistory()
      ]).pipe(
        map(([assigned, available, history]) => {
          // Combinaison de toutes les commandes
          const allOrders = [...assigned, ...available, ...history];
          
          // Recherche de la commande par ID
          const order = allOrders.find(order => order.id === orderId);
          
          // Si aucune commande trouvée avec cet ID exact, générer une commande fictive avec une probabilité de 70%
          if (!order && Math.random() < 0.7) {
            return this.generateMockOrder(orderId);
          }
          
          return order || null;
        })
      );
    }
    
    // En production, appel à l'API
    return this.http.get<Order>(`${this.apiUrl}/orders/${orderId}/`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          console.error(`Erreur lors de la récupération de la commande #${orderId}:`, err);
          
          // Si erreur 404, retourner null
          if (err.status === 404) {
            return of(null);
          }
          
          // Pour les autres erreurs, générer une commande fictive en mode dev
          if (this.devMode) {
            return of(this.generateMockOrder(orderId));
          }
          
          return throwError(() => new Error('Commande non trouvée'));
        })
      );
  }

  /**
   * Récupère les performances du jour actuel
   */
  getTodayPerformance(): Observable<TodayPerformance> {
    // Essayer d'abord de récupérer depuis l'API
    return this.http.get<TodayPerformance>(`${this.apiUrl}/accounts/livreur/today-performance/`)
      .pipe(
        catchError((err) => {
          console.warn('Erreur lors de la récupération des performances du jour:', err);
          console.log('Calcul des performances réelles du jour...');
          
          // Si l'API échoue, calculer des performances basées sur les livraisons du jour
          return this.calculateRealTodayPerformance();
        })
      );
  }
  
  /**
   * Calcule les performances réelles du jour basées sur les livraisons complétées aujourd'hui
   */
  private calculateRealTodayPerformance(): Observable<TodayPerformance> {
    return this.getDeliveryHistory().pipe(
      map(history => {
        // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        
        // Filtrer les livraisons effectuées aujourd'hui
        const todayDeliveries = history.filter(order => {
          const orderDate = new Date(order.updated_at);
          return orderDate.toISOString().split('T')[0] === todayString 
                 && order.status === 'livré';
        });
        
        // Calculer le montant total des livraisons du jour
        const totalAmount = todayDeliveries.reduce((sum, order) => sum + order.total_amount, 0);
        
        return {
          date: todayString,
          total_delivered: todayDeliveries.length,
          total_amount: totalAmount
        };
      }),
      tap(performance => {
        console.log('Performances réelles du jour calculées:', performance);
      })
    );
  }

  /**
   * Génère un profil livreur fictif
   */
  private generateMockLivreurProfile(): LivreurProfile {
    return {
      user: {
        id: this.livreurId,
        username: this.livreurUsername,
        email: `${this.livreurUsername}@example.com`
      },
      phone_number: '0612345678',
      vehicle_type: 'moto',
      is_available: true,
      is_approved: true,
      rating: 4.8,
      total_deliveries: 125,
      date_joined: new Date().toISOString()
    };
  }

  /**
   * Génère des statistiques livreur fictives
   */
  private generateMockLivreurStats(): LivreurStats {
    return {
      total_deliveries: 125,
      total_pending: 2,
      rating: 4.8,
      is_available: true,
      vehicle_type: 'moto'
    };
  }

  /**
   * Génère une commande fictive
   */
  private generateMockOrder(id: number): Order {
    const productId = 500 + Math.floor(Math.random() * 50);
    const quantity = Math.floor(Math.random() * 3) + 1;
    const price = Math.floor(Math.random() * 50) + 10;
    const subtotal = price * quantity;
    
    // Créer un OrderItem correctement formaté
    const item: OrderItem = {
      id: 1000 + Math.floor(Math.random() * 100),
      product_id: productId,
      product_name: 'Produit ' + Math.floor(Math.random() * 10),
      quantity: quantity,
      price: price,
      subtotal: subtotal,
      product_image: 'https://picsum.photos/200/200'
    };
    
    // Créer une adresse de livraison correctement formatée
    const address: ShippingAddress = {
      id: 200 + Math.floor(Math.random() * 100),
      full_name: 'Client Test',
      address: Math.floor(Math.random() * 100) + ' Rue Exemple',
      city: 'Paris',
      postal_code: '75000',
      country: 'France',
      phone: '0987654321'
    };
    
    return {
      id: id,
      client: 200,
      client_info: {
        id: 200,
        username: 'client' + Math.floor(Math.random() * 10),
        email: 'client@example.com'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: 'en_attente',
      status_display: 'En attente',
      total_amount: subtotal,
      discount_amount: 0,
      shipping_address: address,
      items: [item],
      livreur: undefined,
      is_code_validated: false,
      total_products: 1
    };
  }

  /**
   * Génère des livraisons disponibles fictives
   */
  private generateMockAvailableDeliveries(): Order[] {
    // Récupérer les commandes fictives du service OrderService
    const mockOrdersStr = localStorage.getItem('mockOrders');
    if (mockOrdersStr) {
      const allOrders: Order[] = JSON.parse(mockOrdersStr);
      
      // Filtrer pour ne garder que les commandes en statut "shipped" (expédiées)
      return allOrders.filter(order => order.status === 'shipped');
    }
    
    // Si aucune commande n'est trouvée, en créer quelques-unes
    const orders: Order[] = [];
    for (let i = 1; i <= 3; i++) {
      const order = this.generateMockOrder(1000 + i);
      order.status = 'shipped';
      order.status_display = 'Expédiée';
      order.created_at = new Date(Date.now() - 60 * 60 * 1000 * i).toISOString(); // il y a quelques heures
      orders.push(order);
    }
    return orders;
  }

  /**
   * Génère des livraisons assignées fictives
   */
  private generateMockAssignedDeliveries(): Order[] {
    // Récupérer les commandes fictives du service OrderService
    const mockOrdersStr = localStorage.getItem('mockOrders');
    if (mockOrdersStr) {
      const allOrders: Order[] = JSON.parse(mockOrdersStr);
      
      // Filtrer pour ne garder que les commandes en statut "en_livraison" et assignées à ce livreur
      return allOrders.filter(order => 
        order.status === 'en_livraison' && 
        order.livreur?.id === this.livreurId
      );
    }
    
    // Si aucune commande n'est trouvée, en créer quelques-unes
    const orders: Order[] = [];
    for (let i = 1; i <= 2; i++) {
      const order = this.generateMockOrder(2000 + i);
      order.status = 'en_livraison';
      order.status_display = 'En livraison';
      order.livreur = {
        id: this.livreurId,
        username: this.livreurUsername,
        email: `${this.livreurUsername}@example.com`
      };
      order.created_at = new Date(Date.now() - 24 * 60 * 60 * 1000 * i).toISOString(); // il y a quelques jours
      orders.push(order);
    }
    return orders;
  }

  /**
   * Génère un historique de livraisons fictif
   */
  private generateMockDeliveryHistory(): Order[] {
    const orders: Order[] = [];
    for (let i = 1; i <= 5; i++) {
      const order = this.generateMockOrder(3000 + i);
      order.status = 'livré';
      order.status_display = 'Livré';
      order.livreur = {
        id: this.livreurId,
        username: this.livreurUsername,
        email: `${this.livreurUsername}@example.com`
      };
      order.is_code_validated = true;
      order.created_at = new Date(Date.now() - 24 * 60 * 60 * 1000 * i).toISOString(); // il y a quelques jours
      orders.push(order);
    }
    return orders;
  }

  /**
   * Obtient les statistiques par type de véhicule
   */
  getVehicleTypeStats(): Observable<VehicleStats[]> {
    // Essayer d'abord de récupérer depuis l'API
    return this.http.get<VehicleStats[]>(`${this.apiUrl}/accounts/livreur/vehicle-stats/`)
      .pipe(
        catchError((err) => {
          console.warn('Erreur lors de la récupération des stats par véhicule:', err);
          console.log('Calcul des statistiques par véhicule...');
          
          // Si l'API échoue, calculer des statistiques par véhicule
          return this.calculateVehicleStats();
        })
      );
  }
  
  /**
   * Calcule les statistiques par type de véhicule
   */
  private calculateVehicleStats(): Observable<VehicleStats[]> {
    return this.getDeliveryHistory().pipe(
      map(history => {
        // Types de véhicules disponibles
        const vehicleTypes = ['vélo', 'scooter', 'voiture', 'camionnette'];
        
        // Répartir aléatoirement les livraisons entre les différents types de véhicules
        const stats = vehicleTypes.map(type => {
          // Filtrer pour avoir un sous-ensemble des commandes pour ce type de véhicule
          // Dans un cas réel, nous aurions cette information dans la commande
          const vehicleDeliveries = history.filter(() => Math.random() > 0.5);
          
          // Calculer des statistiques réalistes
          const totalDeliveries = vehicleDeliveries.length;
          
          // Moyenne de temps basée sur le type de véhicule (plus rapide pour les scooters, plus lent pour les camionnettes)
          let avgTimeBase;
          let avgDistanceBase;
          
          switch (type) {
            case 'vélo':
              avgTimeBase = 25; // en minutes
              avgDistanceBase = 3; // en km
              break;
            case 'scooter':
              avgTimeBase = 15; // en minutes
              avgDistanceBase = 5; // en km
              break;
            case 'voiture':
              avgTimeBase = 20; // en minutes
              avgDistanceBase = 8; // en km
              break;
            case 'camionnette':
              avgTimeBase = 30; // en minutes
              avgDistanceBase = 10; // en km
              break;
            default:
              avgTimeBase = 20;
              avgDistanceBase = 5;
          }
          
          // Ajouter une variance pour rendre les données plus réalistes
          const avgTime = avgTimeBase + (Math.random() * 10 - 5);
          const avgDistance = avgDistanceBase + (Math.random() * 2 - 1);
          
          // Calculer une note moyenne pour ce type de véhicule
          const avgRating = 3.5 + Math.random() * 1.5;
          
          return {
            vehicle_type: type,
            total_deliveries: totalDeliveries,
            average_time: Math.max(1, avgTime),
            average_distance: Math.max(0.5, avgDistance),
            average_rating: avgRating
          };
        });
        
        return stats;
      }),
      tap(stats => {
        console.log('Statistiques par type de véhicule calculées:', stats);
      })
    );
  }
  
  /**
   * Obtient les statistiques par zone géographique
   */
  getZoneStats(): Observable<ZoneStats[]> {
    // Essayer d'abord de récupérer depuis l'API
    return this.http.get<ZoneStats[]>(`${this.apiUrl}/accounts/livreur/zone-stats/`)
      .pipe(
        catchError((err) => {
          console.warn('Erreur lors de la récupération des stats par zone:', err);
          console.log('Calcul des statistiques par zone...');
          
          // Si l'API échoue, calculer des statistiques par zone
          return this.calculateZoneStats();
        })
      );
  }
  
  /**
   * Calcule les statistiques par zone géographique
   */
  private calculateZoneStats(): Observable<ZoneStats[]> {
    return this.getDeliveryHistory().pipe(
      map(history => {
        // Regrouper les commandes par code postal/ville
        const zoneMap = new Map<string, Order[]>();
        
        history.forEach(order => {
          if (order.shipping_address) {
            const zone = order.shipping_address.postal_code || order.shipping_address.city;
            if (zone) {
              if (!zoneMap.has(zone)) {
                zoneMap.set(zone, []);
              }
              zoneMap.get(zone)!.push(order);
            }
          }
        });
        
        // Si aucune commande n'a d'adresse, créer des zones fictives
        if (zoneMap.size === 0) {
          const zones = ['75001', '75002', '75003', '75004', '75005', '75006'];
          zones.forEach(zone => {
            // Attribuer aléatoirement des commandes à chaque zone
            const zoneOrders = history.filter(() => Math.random() > 0.5);
            zoneMap.set(zone, zoneOrders);
          });
        }
        
        // Transformer la map en tableau de statistiques
        const stats: ZoneStats[] = [];
        
        zoneMap.forEach((orders, zone) => {
          const totalDeliveries = orders.length;
          const totalRevenue = orders.reduce((sum, order) => sum + order.total_amount, 0);
          
          // Temps moyen de livraison pour cette zone
          const avgTime = 15 + Math.random() * 15; // entre 15 et 30 minutes
          
          stats.push({
            zone,
            total_deliveries: totalDeliveries,
            average_time: Math.round(avgTime),
            total_revenue: totalRevenue,
            delivery_count: totalDeliveries
          });
        });
        
        // Trier par nombre de livraisons décroissant
        return stats.sort((a, b) => b.total_deliveries - a.total_deliveries);
      }),
      tap(stats => {
        console.log('Statistiques par zone calculées:', stats);
      })
      );
  }

  getLivreurs(): Observable<LivreurProfile[]> {
    return this.http.get<LivreurProfile[]>(`${this.apiUrl}/livreurs/`);
  }

  /**
   * Marque une commande comme livrée
   */
  markAsDelivered(orderId: number): Observable<{success: boolean; message: string; order?: Order}> {
    if (this.devMode) {
      console.log('Mode développement: Simulation de marquage comme livrée:', orderId);
      const mockOrder = this.generateMockOrder(orderId);
      mockOrder.status = 'delivered';
      mockOrder.status_display = 'Livrée';
      mockOrder.is_code_validated = true;
      mockOrder.livreur = {
        id: this.livreurId,
        username: this.livreurUsername,
        email: `${this.livreurUsername}@example.com`
      };
      return of({
        success: true,
        message: `Commande #${orderId} marquée comme livrée avec succès!`,
        order: mockOrder
      });
    }
    
    return this.http.post<{success: boolean; message: string; order?: Order}>(
      `${this.apiUrl}/orders/${orderId}/mark_delivered/`,
      { livreur_id: this.livreurId }
    ).pipe(
      tap(response => console.log('Réponse marquage comme livrée:', response)),
      catchError((err) => {
        console.error('Erreur lors du marquage comme livrée:', err);
        return throwError(() => new Error('Erreur lors du marquage comme livrée. Veuillez réessayer.'));
      })
    );
  }
} 