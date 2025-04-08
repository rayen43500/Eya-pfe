import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AdminService } from '../../shared/services/admin.service';

interface AdminStats {
  products: number;
  orders: number;
  users: number;
}

@Component({
  selector: 'app-admin-direct-dashboard',
  standalone: true,
  imports: [CommonModule, DatePipe, RouterModule],
  template: `
    <div class="admin-dashboard fade-in">
      <!-- En-tête du tableau de bord -->
      <div class="dashboard-header">
        <div class="welcome-section">
          <h1>Tableau de bord administrateur</h1>
          <p class="text-medium">Bienvenue ! Voici un aperçu de votre activité aujourd'hui</p>
        </div>
        <div class="date-section">
          <div class="current-date text-medium">
            <i class="fas fa-calendar-alt me-2"></i> {{ currentDate | date:'dd MMMM yyyy' }}
          </div>
        </div>
      </div>

      <!-- Métriques principales -->
      <div class="metrics-row">
        <div class="metric-card slide-in-up" [ngStyle]="{'animation-delay': '0.1s'}" (click)="navigateToProductList()" role="button">
          <div class="metric-icon bg-primary-subtle center-all">
            <i class="fas fa-box text-primary"></i>
          </div>
          <div class="metric-content">
            <p class="metric-title">Produits</p>
            <h2 class="metric-value">{{ admins?.products || 0 }}</h2>
            <p class="metric-trend success">
              <i class="fas fa-arrow-up"></i> 12% ce mois
            </p>
          </div>
        </div>

        <div class="metric-card slide-in-up" [ngStyle]="{'animation-delay': '0.2s'}" (click)="navigateToCommandes()" role="button">
          <div class="metric-icon bg-warning-subtle center-all">
            <i class="fas fa-shopping-cart text-warning"></i>
          </div>
          <div class="metric-content">
            <p class="metric-title">Commandes</p>
            <h2 class="metric-value">{{ admins?.orders || 0 }}</h2>
            <p class="metric-trend success">
              <i class="fas fa-arrow-up"></i> 8% ce mois
            </p>
          </div>
        </div>

        <div class="metric-card slide-in-up" [ngStyle]="{'animation-delay': '0.3s'}" (click)="navigateToUtilisateurs()" role="button">
          <div class="metric-icon bg-info-subtle center-all">
            <i class="fas fa-users text-info"></i>
          </div>
          <div class="metric-content">
            <p class="metric-title">Utilisateurs</p>
            <h2 class="metric-value">{{ admins?.users || 0 }}</h2>
            <p class="metric-trend success">
              <i class="fas fa-arrow-up"></i> 5% ce mois
            </p>
          </div>
        </div>
      </div>

      <!-- Résumé des actions et notifications -->
      <div class="info-section">
        <div class="info-card">
          <div class="info-card-header">
            <h3><i class="fas fa-bell me-2"></i> Notifications récentes</h3>
            <span class="badge bg-danger rounded-pill">3</span>
          </div>
          <div class="info-card-body">
            <div class="notification-item">
              <div class="notification-icon bg-primary-subtle">
                <i class="fas fa-shopping-bag text-primary"></i>
              </div>
              <div class="notification-content">
                <p class="notification-title">Nouvelle commande #2458</p>
                <p class="notification-time text-secondary">Il y a 28 minutes</p>
              </div>
            </div>
            <div class="notification-item">
              <div class="notification-icon bg-warning-subtle">
                <i class="fas fa-exclamation-triangle text-warning"></i>
              </div>
              <div class="notification-content">
                <p class="notification-title">Stock faible - Produit #35</p>
                <p class="notification-time text-secondary">Il y a 2 heures</p>
              </div>
            </div>
            <div class="notification-item">
              <div class="notification-icon bg-success-subtle">
                <i class="fas fa-user-plus text-success"></i>
              </div>
              <div class="notification-content">
                <p class="notification-title">Nouvel utilisateur enregistré</p>
                <p class="notification-time text-secondary">Aujourd'hui, 10:45</p>
              </div>
            </div>
          </div>
        </div>

        <div class="info-card">
          <div class="info-card-header">
            <h3><i class="fas fa-tasks me-2"></i> Actions rapides</h3>
          </div>
          <div class="info-card-body">
            <div class="action-buttons">
              <button class="btn btn-primary hover-lift" (click)="navigateToAddProduct()">
                <i class="fas fa-plus-circle me-2"></i> Ajouter un produit
              </button>
              <button class="btn btn-warning hover-lift" (click)="navigateToPromotions()">
                <i class="fas fa-percentage me-2"></i> Gérer promotions
              </button>
              <button class="btn btn-success hover-lift" (click)="navigateToAddUser()">
                <i class="fas fa-user-plus me-2"></i> Nouvel utilisateur
              </button>
              <button class="btn btn-info hover-lift" (click)="navigateToStatistics()">
                <i class="fas fa-chart-line me-2"></i> Voir statistiques
              </button>
              <button class="btn btn-secondary hover-lift" (click)="navigateToCategories()">
                <i class="fas fa-tags me-2"></i> Gérer catégories
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Interface de gestion des produits -->
      <div class="product-management-section">
        <div class="card shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h3 class="mb-0"><i class="fas fa-boxes me-2 text-primary"></i> Gestion des produits</h3>
            <div>
              <button class="btn btn-sm btn-outline-primary me-2" (click)="navigateToProductList()">
                <i class="fas fa-list me-1"></i> Liste
              </button>
              <button class="btn btn-sm btn-primary" (click)="navigateToAddProduct()">
                <i class="fas fa-plus me-1"></i> Ajouter
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6 col-lg-4">
                <div class="product-action-card" (click)="navigateToAddProduct()">
                  <div class="product-action-icon">
                    <i class="fas fa-plus-circle"></i>
                  </div>
                  <h4>Ajouter un produit</h4>
                  <p>Créer un nouveau produit dans votre catalogue</p>
                </div>
              </div>
              <div class="col-md-6 col-lg-4">
                <div class="product-action-card" (click)="navigateToProductList()">
                  <div class="product-action-icon">
                    <i class="fas fa-list"></i>
                  </div>
                  <h4>Liste des produits</h4>
                  <p>Consulter et modifier vos produits existants</p>
                </div>
              </div>
              <div class="col-md-6 col-lg-4">
                <div class="product-action-card" (click)="navigateToCategories()">
                  <div class="product-action-icon">
                    <i class="fas fa-tags"></i>
                  </div>
                  <h4>Catégories</h4>
                  <p>Gérer les catégories de produits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Interface de gestion des promotions -->
      <div class="promotion-management-section">
        <div class="card shadow-sm">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h3 class="mb-0"><i class="fas fa-percentage me-2 text-warning"></i> Gestion des promotions</h3>
            <div>
              <button class="btn btn-sm btn-outline-warning me-2" (click)="navigateToPromotions()">
                <i class="fas fa-list me-1"></i> Liste
              </button>
              <button class="btn btn-sm btn-warning" (click)="navigateToPromotionStats()">
                <i class="fas fa-chart-line me-1"></i> Statistiques
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="row g-3">
              <div class="col-md-6 col-lg-4">
                <div class="promotion-action-card" (click)="navigateToPromotions()">
                  <div class="promotion-action-icon">
                    <i class="fas fa-percentage"></i>
                  </div>
                  <h4>Créer une promotion</h4>
                  <p>Définir de nouvelles remises pour vos produits</p>
                </div>
              </div>
              <div class="col-md-6 col-lg-4">
                <div class="promotion-action-card" (click)="navigateToPromotionStats()">
                  <div class="promotion-action-icon">
                    <i class="fas fa-chart-pie"></i>
                  </div>
                  <h4>Performances</h4>
                  <p>Analyser l'efficacité de vos promotions</p>
                </div>
              </div>
              <div class="col-md-6 col-lg-4">
                <div class="promotion-action-card" (click)="navigateToPromotions()">
                  <div class="promotion-action-icon">
                    <i class="fas fa-calendar-alt"></i>
                  </div>
                  <h4>Promotions planifiées</h4>
                  <p>Gérer vos promotions à venir</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Résumé graphique -->
      <div class="chart-section">
        <div class="chart-card">
          <div class="chart-header">
            <h3>Statistiques mensuelles</h3>
            <div class="chart-period">
              <select class="form-select" (change)="onPeriodChange($event)">
                <option value="month">Ce mois</option>
                <option value="lastMonth">Dernier mois</option>
                <option value="quarter">Derniers 3 mois</option>
              </select>
            </div>
          </div>
          <div class="chart-placeholder center-all">
            <p class="text-center text-medium">
              <i class="fas fa-chart-bar fa-4x mb-3 text-secondary"></i><br>
              Graphique des ventes mensuelles<br>
              <span class="text-small">(Simulation - intégration graphique à venir)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-dashboard {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(0,0,0,0.1);
    }
    
    .welcome-section h1 {
      margin-bottom: 0.5rem;
      color: var(--dark);
      font-weight: 700;
    }
    
    .welcome-section p {
      color: var(--secondary);
      margin-bottom: 0;
    }
    
    .current-date {
      background: var(--light);
      padding: 0.5rem 1rem;
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      color: var(--secondary);
    }
    
    .metrics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .metric-card {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      background-color: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-normal);
      cursor: pointer;
    }
    
    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow);
    }
    
    .metric-icon {
      width: 60px;
      height: 60px;
      border-radius: var(--radius);
      margin-right: 1rem;
      font-size: 1.5rem;
    }
    
    .metric-content {
      flex: 1;
    }
    
    .metric-title {
      font-size: 0.9rem;
      color: var(--secondary);
      margin-bottom: 0.25rem;
    }
    
    .metric-value {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    
    .metric-trend {
      font-size: 0.8rem;
      margin: 0;
    }
    
    .metric-trend.success {
      color: var(--success);
    }
    
    .metric-trend.danger {
      color: var(--danger);
    }
    
    .info-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .info-card {
      background-color: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    
    .info-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background-color: #fcfcfc;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .info-card-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .info-card-body {
      padding: 1.5rem;
    }
    
    .notification-item {
      display: flex;
      align-items: center;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .notification-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    
    .notification-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
    }
    
    .notification-content {
      flex: 1;
    }
    
    .notification-title {
      margin: 0;
      font-weight: 500;
    }
    
    .notification-time {
      margin: 0;
      font-size: 0.8rem;
    }
    
    .product-management-section, .promotion-management-section {
      margin-bottom: 2rem;
    }
    
    .product-action-card, .promotion-action-card {
      height: 100%;
      padding: 1.5rem;
      border-radius: var(--radius);
      background-color: white;
      box-shadow: var(--shadow-sm);
      transition: all var(--transition-normal);
      cursor: pointer;
      text-align: center;
      border: 1px solid rgba(0,0,0,0.03);
    }
    
    .product-action-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow);
      border-color: var(--primary);
    }
    
    .promotion-action-card:hover {
      transform: translateY(-5px);
      box-shadow: var(--shadow);
      border-color: var(--warning);
    }
    
    .product-action-icon, .promotion-action-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      margin-bottom: 1rem;
    }
    
    .product-action-icon {
      background-color: var(--primary-subtle);
      color: var(--primary);
      font-size: 1.5rem;
    }
    
    .promotion-action-icon {
      background-color: var(--warning-subtle);
      color: var(--warning);
      font-size: 1.5rem;
    }
    
    .product-action-card h4, .promotion-action-card h4 {
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    
    .product-action-card p, .promotion-action-card p {
      color: var(--secondary);
      margin-bottom: 0;
      font-size: 0.9rem;
    }
    
    .action-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
    }
    
    .chart-section {
      margin-bottom: 1.5rem;
    }
    
    .chart-card {
      background-color: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-sm);
      overflow: hidden;
    }
    
    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background-color: #fcfcfc;
      border-bottom: 1px solid rgba(0,0,0,0.05);
    }
    
    .chart-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .chart-placeholder {
      height: 300px;
      background-color: #fcfcfc;
      color: var(--secondary);
    }
    
    @media (max-width: 768px) {
      .dashboard-header {
        flex-direction: column;
      }
      
      .date-section {
        margin-top: 1rem;
      }
      
      .metrics-row {
        grid-template-columns: 1fr;
      }
      
      .info-section {
        grid-template-columns: 1fr;
      }
      
      .action-buttons {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminDirectDashboardComponent implements OnInit {
  admins: AdminStats | null = null;
  currentDate = new Date();

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Données statiques pour la démo
    this.admins = {
      products: 24,
      orders: 18,
      users: 32
    };
    
    // Commenté pour éviter l'erreur API temporairement
    /*
    this.adminService.getAdmins().subscribe(
      (data: AdminStats) => {
        this.admins = data;
        console.log(this.admins);
      },
      (error: Error) => {
        console.log(error);
      }
    );
    */
  }

  navigateToAddProduct(): void {
    console.log('Navigation vers la page d\'ajout de produit');
    window.location.href = '/ajouter-produit';
  }
  
  navigateToProductList(): void {
    console.log('Navigation vers la liste des produits');
    window.location.href = '/produits';
  }
  
  navigateToCategories(): void {
    console.log('Navigation vers les catégories de produits');
    window.location.href = '/categories';
  }
  
  navigateToPromotions(): void {
    console.log('Navigation vers la page des promotions');
    window.location.href = '/promotions';
  }
  
  navigateToPromotionStats(): void {
    console.log('Navigation vers les statistiques des promotions');
    // Comme il n'y a pas d'ID spécifié, nous redirigerons vers la page principale des promotions
    // qui contient des statistiques générales
    window.location.href = '/promotions';
  }

  navigateToCommandes(): void {
    console.log('Navigation vers la page des commandes');
    window.location.href = '/direct-commandes';
  }

  navigateToUtilisateurs(): void {
    console.log('Navigation vers la page des utilisateurs');
    window.location.href = '/direct-utilisateurs';
  }

  navigateToAddUser(): void {
    this.router.navigate(['/utilisateurs']);
  }

  navigateToStatistics(): void {
    this.router.navigate(['/statistics']);
  }

  onPeriodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    console.log('Période sélectionnée:', select.value);
    // Ici on pourrait charger des données spécifiques pour la période sélectionnée
  }
} 