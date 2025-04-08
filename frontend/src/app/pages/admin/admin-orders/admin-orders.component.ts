import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Order } from '../../../services/order.service';
import { AuthService } from '../../../services/auth.service';
import { Router } from '@angular/router';
import { LivreurService } from '../../../services/livreur.service';

@Component({
  selector: 'app-admin-orders',
  templateUrl: './admin-orders.component.html',
  styleUrls: ['./admin-orders.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class AdminOrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = false;
  error: string | null = null;
  searchTerm = '';
  filteredOrders: Order[] = [];
  statusFilter = '';
  selectedOrder: Order | null = null;
  tempStatus: string = '';
  tempLivreur: number | null = null;
  isSaving: boolean = false;
  saveSuccess: boolean = false;
  saveError: string | null = null;
  livreurs: any[] = [];
  statusOptions = [
    { value: '', label: 'Sélectionner un statut' },
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
    private router: Router,
    private livreurService: LivreurService
  ) { }

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/login-admin']);
      return;
    }
    
    this.loadOrders();
    this.loadLivreurs();
  }

  loadOrders(): void {
    this.loading = true;
    this.error = null;
    
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.filteredOrders = orders;
        this.loading = false;
        console.log('Commandes chargées:', orders.length);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.error = 'Erreur lors du chargement des commandes';
        this.loading = false;
      }
    });
  }

  loadLivreurs(): void {
    this.livreurService.getLivreurs().subscribe({
      next: (livreurs) => {
        this.livreurs = livreurs;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des livreurs:', error);
      }
    });
  }

  filterOrders(): void {
    this.filteredOrders = this.orders.filter(order => {
      // Filtrer par status si défini
      if (this.statusFilter && order.status !== this.statusFilter) {
        return false;
      }

      // Recherche textuelle
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        return (
          order.id.toString().includes(term) || 
          (order.client_info?.username && order.client_info.username.toLowerCase().includes(term)) ||
          (order.status_display && order.status_display.toLowerCase().includes(term)) ||
          (order.created_at && new Date(order.created_at).toLocaleDateString().includes(term)) ||
          (order.total_amount.toString().includes(term)) ||
          (order.delivery_code && order.delivery_code.toLowerCase().includes(term))
        );
      }

      return true;
    });
  }

  search(): void {
    this.filterOrders();
  }

  refreshOrders(): void {
    this.loadOrders();
  }

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
    const statusOption = this.statusOptions.find(option => option.value === status);
    return statusOption ? statusOption.label : status;
  }

  showOrderDetails(order: Order): void {
    this.selectedOrder = order;
  }

  closeOrderDetails(): void {
    this.selectedOrder = null;
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

  selectOrder(order: any): void {
    this.selectedOrder = order;
    this.tempStatus = order.status;
    this.tempLivreur = order.livreur?.id || null;
  }

  saveOrderChanges(): void {
    if (!this.selectedOrder) return;

    this.isSaving = true;
    this.saveError = null;
    this.saveSuccess = false;

    // Si seul le statut est modifié, utiliser updateOrderStatus
    if (this.tempStatus !== this.selectedOrder.status && this.tempLivreur === (this.selectedOrder.livreur?.id || null)) {
      this.orderService.updateOrderStatus(this.selectedOrder.id, this.tempStatus).subscribe({
        next: (updatedOrder) => {
          // Mettre à jour la commande dans la liste
          const index = this.orders.findIndex(o => o.id === updatedOrder.id);
          if (index !== -1) {
            this.orders[index] = updatedOrder;
            this.filterOrders();
          }

          // Mettre à jour la commande sélectionnée
          this.selectedOrder = updatedOrder;
          this.tempStatus = updatedOrder.status;
          this.tempLivreur = updatedOrder.livreur?.id || null;

          this.saveSuccess = true;
          this.isSaving = false;

          // Cacher le message de succès après 3 secondes
          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du statut de la commande:', error);
          this.saveError = 'Erreur lors de la mise à jour du statut de la commande';
          this.isSaving = false;
        }
      });
      return;
    }

    // Créer l'objet de mise à jour pour les autres cas
    const updateData: any = {};
    if (this.tempStatus !== this.selectedOrder.status) {
      updateData.status = this.tempStatus;
    }
    if (this.tempLivreur !== (this.selectedOrder.livreur?.id || null)) {
      updateData.livreur = this.tempLivreur;
    }

    // Si aucune modification, ne rien faire
    if (Object.keys(updateData).length === 0) {
      this.isSaving = false;
      return;
    }

    this.orderService.updateOrder(this.selectedOrder.id, updateData).subscribe({
      next: (updatedOrder) => {
        // Mettre à jour la commande dans la liste
        const index = this.orders.findIndex(o => o.id === updatedOrder.id);
        if (index !== -1) {
          this.orders[index] = updatedOrder;
          this.filterOrders();
        }

        // Mettre à jour la commande sélectionnée
        this.selectedOrder = updatedOrder;
        this.tempStatus = updatedOrder.status;
        this.tempLivreur = updatedOrder.livreur?.id || null;

        this.saveSuccess = true;
        this.isSaving = false;

        // Cacher le message de succès après 3 secondes
        setTimeout(() => {
          this.saveSuccess = false;
        }, 3000);
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour de la commande:', error);
        this.saveError = 'Erreur lors de la mise à jour de la commande';
        this.isSaving = false;
      }
    });
  }
} 