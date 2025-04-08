import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class DashboardComponent implements OnInit {
  userProfile: any = null;
  loading = true;
  error = '';
  totalSales: number = 0;
  ordersToday: number = 0;
  productsInStock: number = 0;
  lowStockCount: number = 5;
  pendingOrdersCount: number = 3;
  totalUsers: number = 120;
  activePromotions: number = 2;
  
  // Données pour les commandes récentes
  recentOrders = [
    {
      id: '1001',
      customerName: 'Jean Dupont',
      date: new Date('2023-05-15'),
      amount: 125.50,
      status: 'completed'
    },
    {
      id: '1002',
      customerName: 'Marie Martin',
      date: new Date('2023-05-14'),
      amount: 89.99,
      status: 'pending'
    },
    {
      id: '1003',
      customerName: 'Paul Bernard',
      date: new Date('2023-05-12'),
      amount: 210.75,
      status: 'cancelled'
    },
    {
      id: '1004',
      customerName: 'Sophie Lambert',
      date: new Date('2023-05-10'),
      amount: 56.25,
      status: 'completed'
    }
  ];

  showBackToTop = false;

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.loadUserProfile();
    this.loadDashboardData();
    this.setupScrollListener();
  }

  setupScrollListener() {
    window.addEventListener('scroll', () => {
      this.showBackToTop = window.scrollY > 300;
    });
  }

  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  loadUserProfile() {
    console.log('🔍 Tentative de chargement du profil admin');
    console.log('LocalStorage complet:', this.getLocalStorageItems());
    
    // Vérifie uniquement le admin_token pour être cohérent avec AdminAuthGuard
    const token = localStorage.getItem('admin_token');
    if (!token) {
      console.error('❌ Aucun token admin trouvé dans localStorage');
      this.router.navigate(['/login']);
      return;
    }

    console.log('✅ Token admin trouvé, chargement du profil...');
    
    const headers = new HttpHeaders({
      'Authorization': `Token ${token}`,
      'Content-Type': 'application/json'
    });

    // Remplacer par une fonction mockée pour le développement si l'API n'est pas prête
    this.mockUserProfile();
    
    // Commenter l'appel API réel si nécessaire pour le développement
    /*
    this.http.get(`${environment.apiUrl}/auth/profile/`, { headers })
      .subscribe({
        next: (response: any) => {
          this.userProfile = response;
          this.loading = false;
        },
        error: (error) => {
          console.error('Failed to load profile', error);
          this.error = 'Failed to load profile';
          this.loading = false;
          if (error.status === 401) {
            localStorage.removeItem('admin_token');
            this.router.navigate(['/login']);
          }
        }
      });
    */
  }

  // Fonction pour simuler un profil utilisateur
  mockUserProfile() {
    console.log('Utilisation d\'un profil administrateur simulé');
    this.userProfile = {
      username: 'admin',
      email: 'admin@example.com',
      first_name: 'Admin',
      last_name: 'User',
      role: 'Administrator'
    };
    this.loading = false;
  }

  // Fonction utilitaire pour déboguer le localStorage
  private getLocalStorageItems(): string {
    const items: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        items[key] = localStorage.getItem(key) || '';
      }
    }
    return JSON.stringify(items);
  }

  loadDashboardData() {
    console.log('Chargement des données du dashboard...');
    // Simuler un appel API avec un délai minimal
    setTimeout(() => {
      this.totalSales = 15240.75;
      this.ordersToday = 8;
      this.productsInStock = 157;
      this.loading = false;
      console.log('✅ Données du dashboard chargées avec succès');
    }, 500);
  }

  logout() {
    console.log('🚪 Déconnexion admin en cours...');
    
    // Nettoyage complet du localStorage
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('user_type');
    
    console.log('✅ Déconnexion réussie, redirection vers login');
    this.router.navigate(['/login']);
    
    // L'appel à l'API de déconnexion n'est plus nécessaire ici
  }

  navigateTo(path: string) {
    console.log('Navigating to', path);
    this.router.navigate([path]);
  }

  viewOrderDetails(orderId: string) {
    this.router.navigate([`/commandes/${orderId}`]);
  }

  viewLowStockProducts() {
    this.router.navigate(['/produits'], { queryParams: { filter: 'lowStock' } });
  }
} 