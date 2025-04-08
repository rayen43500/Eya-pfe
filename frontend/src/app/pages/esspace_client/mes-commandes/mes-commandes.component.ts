import { Component, OnInit } from '@angular/core';
import { OrderService, Order } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-mes-commandes',
  templateUrl: './mes-commandes.component.html',
  styleUrls: ['./mes-commandes.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class MesCommandesComponent implements OnInit {
  orders: Order[] = [];
  filteredOrders: Order[] = [];
  searchTerm: string = '';
  statusFilter: string = '';
  isLoading: boolean = false;
  error: string | null = null;
  selectedOrder: Order | null = null;
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'pending', label: 'En attente' },
    { value: 'pending_payment', label: 'En attente de paiement' },
    { value: 'processing', label: 'En traitement' },
    { value: 'shipped', label: 'Expédiée' },
    { value: 'delivered', label: 'Livrée' },
    { value: 'cancelled', label: 'Annulée' }
  ];

  constructor(
    private orderService: OrderService,
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login-client'], { queryParams: { returnUrl: '/mes-commandes' } });
      return;
    }
    
    this.loadOrders();
  }

  /**
   * Charge les commandes du client connecté
   */
  loadOrders(): void {
    this.isLoading = true;
    this.error = null;
    
    this.orderService.getClientOrders().subscribe({
      next: (orders) => {
        console.log('Commandes reçues:', orders);
        this.orders = orders;
        this.filterOrders();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.error = 'Erreur lors du chargement des commandes';
        this.isLoading = false;
      }
    });
  }

  /**
   * Filtre les commandes en fonction des critères de recherche
   */
  filterOrders(): void {
    this.filteredOrders = this.orders.filter(order => {
      const matchesSearch = !this.searchTerm || 
        order.id.toString().includes(this.searchTerm) ||
        order.status.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesStatus = !this.statusFilter || 
        order.status === this.statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }

  /**
   * Recherche parmi les commandes
   */
  search(): void {
    this.filterOrders();
  }

  /**
   * Rafraîchit la liste des commandes
   */
  refreshOrders(): void {
    this.loadOrders();
  }

  /**
   * Obtient la classe CSS pour un statut
   */
  getStatusClass(status: string): string {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'processing':
        return 'status-processing';
      case 'shipped':
        return 'status-shipped';
      case 'delivered':
        return 'status-delivered';
      case 'cancelled':
        return 'status-cancelled';
      default:
        return '';
    }
  }

  getStatusLabel(status: string): string {
    const option = this.statusOptions.find(opt => opt.value === status);
    return option ? option.label : status;
  }

  /**
   * Affiche les détails d'une commande
   */
  showOrderDetails(order: Order): void {
    this.selectedOrder = order;
    
    // Si la commande n'a pas encore les détails complets, les charger
    if (!order.items || order.items.length === 0) {
      this.isLoading = true;
      this.orderService.getOrderDetails(order.id).subscribe({
        next: (completeOrder) => {
          this.selectedOrder = completeOrder;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des détails de la commande:', err);
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Ferme le modal des détails de commande
   */
  closeOrderDetails(): void {
    this.selectedOrder = null;
  }

  /**
   * Revenir à la boutique
   */
  backToShop(): void {
    this.router.navigate(['/shoop-bord']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
