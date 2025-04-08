import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, forkJoin } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { OrderService } from './order.service';
import { ProductService } from './product.service';

// Interfaces pour les données de statistiques
export interface SalesData {
  name: string;
  series: { name: string; value: number }[];
}

export interface CategoryData {
  name: string;
  value: number;
}

export interface TopProduct {
  id: number;
  name: string;
  image: string;
  sales: number;
  revenue: number;
}

export interface SalesTrend {
  period: string;
  percentage: number;
  isPositive: boolean;
}

export type StatsPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DashboardStats {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  salesOverTime: SalesData[];
  categorySales: CategoryData[];
  topProducts: TopProduct[];
  salesTrend: SalesTrend;
  revenueByRegion?: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class StatsService {
  private apiUrl = `${environment.apiUrl}/api/stats`;
  
  constructor(
    private http: HttpClient,
    private orderService: OrderService,
    private productService: ProductService
  ) { }
  
  getDashboardStats(period: StatsPeriod = 'monthly'): Observable<DashboardStats> {
    // En mode production, utilisez ceci:
    if (!environment.devMode) {
      return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard?period=${period}`)
        .pipe(
          catchError(this.handleError)
        );
    }
    
    // Mode développement: générer des données basées sur les commandes et produits existants
    console.log('Génération de statistiques réalistes basées sur les données existantes');
    return this.generateRealisticStats(period);
  }
  
  /**
   * Récupère les statistiques des ventes par région
   */
  getSalesByRegion(): Observable<{[key: string]: number}> {
    if (!environment.devMode) {
      return this.http.get<{[key: string]: number}>(`${this.apiUrl}/sales-by-region`)
        .pipe(catchError(this.handleError));
    }
    
    // Générer des données de ventes par région
    return of(this.generateSalesByRegion());
  }
  
  /**
   * Récupère les statistiques des produits les plus vendus
   */
  getTopProducts(limit: number = 5): Observable<TopProduct[]> {
    if (!environment.devMode) {
      return this.http.get<TopProduct[]>(`${this.apiUrl}/top-products?limit=${limit}`)
        .pipe(catchError(this.handleError));
    }
    
    // Générer des données des produits les plus vendus
    return of(this.generateMockTopProducts().slice(0, limit));
  }
  
  /**
   * Génère des statistiques réalistes basées sur les commandes et produits existants
   */
  private generateRealisticStats(period: StatsPeriod): Observable<DashboardStats> {
    return forkJoin({
      orders: this.orderService.getOrders(),
      products: this.productService.getProducts()
    }).pipe(
      map(({ orders, products }) => {
        console.log(`Générer des statistiques à partir de ${orders.length} commandes et ${products.length} produits`);
        
        // Filtrer les commandes pour ne garder que celles qui sont livrées et confirmées
        const validOrders = orders.filter(order => 
          order.status === 'delivered' || 
          order.status === 'completed' || 
          order.status === 'confirmed'
        );
        
        console.log(`Sur ${orders.length} commandes, ${validOrders.length} sont livrées/confirmées et incluses dans les statistiques`);
        
        // Calculer les statistiques de base
        const totalSales = validOrders.reduce((sum, order) => sum + order.total_amount, 0);
        const totalOrders = validOrders.length;
        
        // Extraire les clients uniques
        const uniqueClients = new Set(validOrders.map(order => order.client));
        const totalCustomers = uniqueClients.size;
        
        // Calculer la valeur moyenne des commandes
        const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;
        
        // Générer les données de ventes au fil du temps
        const salesOverTime = this.generateRealisticTimeData(validOrders, period);
        
        // Générer les données de ventes par catégorie
        const categorySales = this.generateRealisticCategoryData(validOrders, products);
        
        // Générer les données des produits les plus vendus
        const topProducts = this.generateRealisticTopProducts(validOrders, products);
        
        // Calculer la tendance des ventes
        const salesTrend = this.calculateSalesTrend(validOrders);
        
        // Générer les données de ventes par région
        const revenueByRegion = this.generateRealisticSalesByRegion(validOrders);
        
        return {
          totalSales,
          totalOrders,
          totalCustomers,
          averageOrderValue,
          salesOverTime,
          categorySales,
          topProducts,
          salesTrend,
          revenueByRegion
        };
      }),
      catchError(error => {
        console.error('Erreur lors de la génération des statistiques réalistes:', error);
        // Fallback sur des données simulées
        return of(this.generateMockDashboardStats(period));
      })
    );
  }
  
  /**
   * Calcule la tendance des ventes par rapport à la période précédente
   */
  private calculateSalesTrend(orders: any[]): SalesTrend {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    
    // Commandes des 30 derniers jours
    const recentOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= thirtyDaysAgo && orderDate <= now;
    });
    
    // Commandes des 30 jours précédents
    const previousOrders = orders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= sixtyDaysAgo && orderDate < thirtyDaysAgo;
    });
    
    const recentSales = recentOrders.reduce((sum, order) => sum + order.total_amount, 0);
    const previousSales = previousOrders.reduce((sum, order) => sum + order.total_amount, 0);
    
    let percentage = 0;
    let isPositive = true;
    
    if (previousSales > 0) {
      percentage = ((recentSales - previousSales) / previousSales) * 100;
      isPositive = percentage >= 0;
      percentage = Math.abs(percentage);
    } else if (recentSales > 0) {
      percentage = 100;
      isPositive = true;
    }
    
    return {
      period: 'mensuelle',
      percentage: parseFloat(percentage.toFixed(1)),
      isPositive
    };
  }
  
  /**
   * Génère des données de ventes au fil du temps plus réalistes
   */
  private generateRealisticTimeData(orders: any[], period: StatsPeriod): SalesData[] {
    // Déterminer les points de temps en fonction de la période
    let timePoints: string[] = [];
    let timeFormat: (date: Date) => string;
    let startDate: Date;
    let endDate = new Date();
    
    switch (period) {
      case 'daily':
        timePoints = Array.from({length: 24}, (_, i) => `${i}h`);
        timeFormat = (date) => `${date.getHours()}h`;
        startDate = new Date(endDate);
        startDate.setHours(0, 0, 0, 0);
        break;
      
      case 'weekly':
        timePoints = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        timeFormat = (date) => {
          const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          return days[date.getDay()];
        };
        startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 7);
        break;
      
      case 'monthly':
        timePoints = Array.from({length: 30}, (_, i) => `${i+1}`);
        timeFormat = (date) => `${date.getDate()}`;
        startDate = new Date(endDate);
        startDate.setDate(1);
        break;
      
      case 'yearly':
        timePoints = [
          'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
          'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'
        ];
        timeFormat = (date) => {
          const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
          return months[date.getMonth()];
        };
        startDate = new Date(endDate);
        startDate.setMonth(0, 1);
        break;
    }
    
    // Initialiser les valeurs à zéro
    const salesByTimePoint: { [key: string]: number } = {};
    timePoints.forEach(point => salesByTimePoint[point] = 0);
    
    // Calculer les ventes pour chaque point de temps mais uniquement pour les commandes validées
    orders.forEach(order => {
      // Vérifier que la commande est confirmée/livrée
      if (order.status === 'delivered' || order.status === 'completed' || order.status === 'confirmed') {
        const orderDate = new Date(order.created_at);
        
        // Utiliser la date de livraison si disponible, sinon la date de création
        const dateToUse = order.delivered_at ? new Date(order.delivered_at) : orderDate;
        
        // Vérifier si la commande est dans la période
        if (dateToUse >= startDate && dateToUse <= endDate) {
          const timePoint = timeFormat(dateToUse);
          
          if (salesByTimePoint[timePoint] !== undefined) {
            salesByTimePoint[timePoint] += order.total_amount;
          }
        }
      }
    });
    
    // Transformer en format attendu
    const series = timePoints.map(point => ({
      name: point,
      value: salesByTimePoint[point]
    }));
    
    return [{
      name: 'Ventes',
      series: series
    }];
  }
  
  /**
   * Génère des données de ventes par catégorie plus réalistes
   */
  private generateRealisticCategoryData(orders: any[], products: any[]): CategoryData[] {
    // Mapping des IDs de produits vers leurs catégories
    const productCategoryMap = new Map<number, string>();
    products.forEach(product => productCategoryMap.set(product.id, product.category || 'Non catégorisé'));
    
    // Initialiser les ventes par catégorie
    const salesByCategory: { [key: string]: number } = {};
    
    // Calculer les ventes par catégorie uniquement pour les commandes validées
    orders.forEach(order => {
      // Vérifier que la commande est confirmée/livrée
      if (
        (order.status === 'delivered' || 
        order.status === 'completed' || 
        order.status === 'confirmed') && 
        order.items && 
        Array.isArray(order.items)
      ) {
        order.items.forEach((item: any) => {
          const productId = item.product_id;
          const category = productCategoryMap.get(productId) || 'Non catégorisé';
          
          if (!salesByCategory[category]) {
            salesByCategory[category] = 0;
          }
          
          salesByCategory[category] += item.subtotal || (item.price * item.quantity) || 0;
        });
      }
    });
    
    // Transformer en format attendu
    return Object.keys(salesByCategory).map(category => ({
      name: category,
      value: salesByCategory[category]
    }));
  }
  
  /**
   * Génère des données des produits les plus vendus plus réalistes
   */
  private generateRealisticTopProducts(orders: any[], products: any[]): TopProduct[] {
    // Calculer les ventes par produit
    const productSales: { [key: number]: { quantity: number, revenue: number } } = {};
    
    // Ne compter que les commandes validées
    orders.forEach(order => {
      // Vérifier que la commande est confirmée/livrée
      if (
        (order.status === 'delivered' || 
        order.status === 'completed' || 
        order.status === 'confirmed') && 
        order.items && 
        Array.isArray(order.items)
      ) {
        order.items.forEach((item: any) => {
          const productId = item.product_id;
          
          if (!productSales[productId]) {
            productSales[productId] = { quantity: 0, revenue: 0 };
          }
          
          productSales[productId].quantity += item.quantity || 1;
          productSales[productId].revenue += item.subtotal || (item.price * item.quantity) || 0;
        });
      }
    });
    
    // Trouver les informations des produits
    const topProducts: TopProduct[] = [];
    
    Object.keys(productSales).forEach(productIdStr => {
      const productId = parseInt(productIdStr);
      const product = products.find(p => p.id === productId);
      
      if (product) {
        topProducts.push({
          id: productId,
          name: product.name,
          image: product.image || `https://picsum.photos/id/${(productId % 50) + 10}/200/200`,
          sales: productSales[productId].quantity,
          revenue: productSales[productId].revenue
        });
      }
    });
    
    // Trier par revenu et limiter à 5
    return topProducts
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }
  
  /**
   * Génère des données de ventes par région
   */
  private generateSalesByRegion(): {[key: string]: number} {
    // Dans une implémentation réelle, cela serait basé sur les adresses de livraison des commandes
    // Pour l'instant, nous utilisons des données simulées mais réalistes
    const regions: {[key: string]: number} = {
      'Île-de-France': Math.floor(Math.random() * 20000) + 10000,
      'Auvergne-Rhône-Alpes': Math.floor(Math.random() * 15000) + 8000,
      'Provence-Alpes-Côte d\'Azur': Math.floor(Math.random() * 12000) + 7000,
      'Occitanie': Math.floor(Math.random() * 9000) + 5000,
      'Nouvelle-Aquitaine': Math.floor(Math.random() * 8000) + 4000,
      'Hauts-de-France': Math.floor(Math.random() * 7000) + 3500,
      'Grand Est': Math.floor(Math.random() * 6500) + 3000,
      'Bretagne': Math.floor(Math.random() * 6000) + 2800,
      'Normandie': Math.floor(Math.random() * 5500) + 2500,
      'Pays de la Loire': Math.floor(Math.random() * 5000) + 2300,
      'Bourgogne-Franche-Comté': Math.floor(Math.random() * 4500) + 2000,
      'Centre-Val de Loire': Math.floor(Math.random() * 4000) + 1800
    };
    
    return regions;
  }
  
  /**
   * Génère des données de ventes par région basées sur les adresses de livraison des commandes
   */
  private generateRealisticSalesByRegion(orders: any[]): {[key: string]: number} {
    // Initialiser les ventes par région à zéro
    const regions: {[key: string]: number} = {
      'Île-de-France': 0,
      'Auvergne-Rhône-Alpes': 0,
      'Provence-Alpes-Côte d\'Azur': 0,
      'Occitanie': 0,
      'Nouvelle-Aquitaine': 0,
      'Hauts-de-France': 0,
      'Grand Est': 0,
      'Bretagne': 0,
      'Normandie': 0,
      'Pays de la Loire': 0,
      'Bourgogne-Franche-Comté': 0,
      'Centre-Val de Loire': 0,
      'Autre': 0 // Pour les régions non reconnues
    };
    
    // Analyser les adresses de livraison des commandes
    orders.forEach(order => {
      if (order.shipping_address) {
        const address = order.shipping_address;
        // Essayer de déterminer la région à partir du code postal ou de la ville
        let region = this.determineRegionFromAddress(address);
        
        // Si la région n'est pas reconnue, la mettre dans "Autre"
        if (!regions[region]) {
          region = 'Autre';
        }
        
        // Ajouter le montant de la commande aux ventes de cette région
        regions[region] += order.total_amount || 0;
      }
    });
    
    // Supprimer les régions sans ventes
    Object.keys(regions).forEach(key => {
      if (regions[key] === 0) {
        delete regions[key];
      }
    });
    
    // Si aucune vente n'a été attribuée à une région (par exemple si les adresses sont manquantes),
    // revenir à des données simulées
    if (Object.keys(regions).filter(key => regions[key] > 0).length === 0) {
      return this.generateSalesByRegion();
    }
    
    return regions;
  }
  
  /**
   * Détermine la région française à partir d'une adresse de livraison
   */
  private determineRegionFromAddress(address: any): string {
    // Par défaut, utiliser une attribution aléatoire pondérée
    const regions = [
      'Île-de-France',
      'Auvergne-Rhône-Alpes',
      'Provence-Alpes-Côte d\'Azur',
      'Occitanie',
      'Nouvelle-Aquitaine',
      'Hauts-de-France',
      'Grand Est',
      'Bretagne',
      'Normandie',
      'Pays de la Loire',
      'Bourgogne-Franche-Comté',
      'Centre-Val de Loire'
    ];
    
    // Probabilités pondérées basées sur la population réelle des régions
    const weights = [18, 12, 9, 8, 9, 9, 8, 5, 5, 6, 4, 4];
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    
    // Dans une implémentation réelle, on utiliserait le code postal
    // ou la ville pour déterminer la région précise
    
    // Pour l'instant, sélection pondérée aléatoire
    const random = Math.random() * totalWeight;
    let sum = 0;
    
    for (let i = 0; i < weights.length; i++) {
      sum += weights[i];
      if (random < sum) {
        return regions[i];
      }
    }
    
    return regions[0]; // Fallback sur Île-de-France
  }
  
  private generateMockDashboardStats(period: StatsPeriod): DashboardStats {
    return {
      totalSales: Math.floor(Math.random() * 10000) + 5000,
      totalOrders: Math.floor(Math.random() * 500) + 100,
      totalCustomers: Math.floor(Math.random() * 200) + 50,
      averageOrderValue: Math.floor(Math.random() * 100) + 20,
      salesOverTime: this.generateMockTimeData(period),
      categorySales: this.generateMockCategoryData(),
      topProducts: this.generateMockTopProducts(),
      salesTrend: {
        period: 'mensuelle',
        percentage: parseFloat((Math.random() * 20).toFixed(1)),
        isPositive: Math.random() > 0.3 // 70% de tendance positive
      },
      revenueByRegion: this.generateSalesByRegion()
    };
  }
  
  private generateMockCategoryData(): CategoryData[] {
    const categories = ['Électronique', 'Vêtements', 'Alimentation', 'Meubles', 'Livres'];
    return categories.map(category => ({
      name: category,
      value: Math.floor(Math.random() * 1000) + 200
    }));
  }
  
  private generateMockTimeData(period: StatsPeriod): SalesData[] {
    let timePoints: string[];
    let series: { name: string; value: number }[] = [];
    
    switch (period) {
      case 'daily':
        timePoints = Array.from({length: 24}, (_, i) => `${i}h`);
        series = timePoints.map(time => ({
          name: time,
          value: Math.floor(Math.random() * 500) + 50
        }));
        break;
      
      case 'weekly':
        timePoints = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
        series = timePoints.map(day => ({
          name: day,
          value: Math.floor(Math.random() * 2000) + 200
        }));
        break;
      
      case 'monthly':
        timePoints = Array.from({length: 30}, (_, i) => `Jour ${i+1}`);
        series = timePoints.map(day => ({
          name: day,
          value: Math.floor(Math.random() * 1000) + 100
        }));
        break;
      
      case 'yearly':
        timePoints = [
          'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
          'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];
        series = timePoints.map(month => ({
          name: month,
          value: Math.floor(Math.random() * 10000) + 1000
        }));
        break;
    }
    
    return [{
      name: 'Ventes',
      series: series
    }];
  }
  
  private generateMockTopProducts(): TopProduct[] {
    const productNames = [
      'Smartphone XYZ', 
      'Ordinateur portable ABC',
      'Écouteurs sans fil',
      'Montre connectée',
      'Téléviseur 4K'
    ];
    
    return productNames.map((name, index) => ({
      id: index + 1,
      name: name,
      image: `https://picsum.photos/id/${(index + 10) * 5}/200/200`,
      sales: Math.floor(Math.random() * 200) + 20,
      revenue: Math.floor(Math.random() * 5000) + 500
    }));
  }
  
  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    let errorMessage = 'Une erreur s\'est produite lors de la récupération des statistiques.';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
