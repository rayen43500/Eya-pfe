import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderService, Order } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-commandes',
  standalone: false,
  templateUrl: './commandes.component.html',
  styleUrl: './commandes.component.css'
})
export class CommandesComponent implements OnInit, OnDestroy {
  orders: Order[] = [];
  selectedOrder: Order | null = null;
  loading = false;
  error = '';
  hasModifications = false;  // Track if there are unsaved changes
  
  // Pour le modal de détail
  showModal = false;
  
  // Pour le filtre par statut
  statusFilter: string = '';
  
  // Pour la fonctionnalité de recherche
  searchTerm: string = '';
  
  // Pour l'assignation des livreurs
  availableLivreurs: any[] = [];
  selectedLivreur: number | null = null;
  
  // Pour la notification de nouvelles commandes
  hasNewOrders: boolean = false;
  orderCount: number = 0;
  private refreshSubscription?: Subscription;
  
  constructor(
    private orderService: OrderService,
    private authService: AuthService
  ) {
    // Ne pas vider les données fictives du localStorage
    // this.orderService.clearMockData();
  }

  ngOnInit(): void {
    // Vérifier si l'utilisateur est connecté
    if (this.authService.isLoggedIn()) {
      console.log('Utilisateur connecté, chargement des commandes');
      this.loadOrders();
      
      // Si l'utilisateur est un admin, configurer un rafraîchissement automatique
      if (this.isAdmin()) {
        this.setupAutoRefresh();
        this.loadAvailableLivreurs();
      }
    } else {
      console.error('Utilisateur non connecté, impossible de charger les commandes');
      this.error = 'Veuillez vous connecter pour voir vos commandes';
    }
  }
  
  ngOnDestroy(): void {
    // Se désabonner pour éviter les fuites de mémoire
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadOrders(): void {
    this.loading = true;
    this.error = '';
    console.log('Tentative de chargement des commandes...');
    console.log('URL du backend utilisée:', this.orderService['apiUrl']);
    
    this.orderService.getOrders().subscribe({
      next: (data) => {
        console.log('Commandes reçues:', data);
        
        // Vérifier s'il y a de nouvelles commandes depuis le dernier chargement
        if (this.orders.length > 0 && data.length > this.orders.length) {
          this.hasNewOrders = true;
          
          // Filtrer les nouvelles commandes
          const newOrders = data.filter(newOrder => 
            !this.orders.some(existingOrder => existingOrder.id === newOrder.id)
          );
          
          // Afficher une notification pour chaque nouvelle commande
          newOrders.forEach(order => {
            this.showNotification(`Nouvelle commande #${order.id} reçue de ${order.client_info?.username || 'Client'}`, 'info');
          });
        }
        
        this.orders = data;
        this.orderCount = data.length;
        this.loading = false;
        
        // Effacer toute erreur précédente puisque le chargement a réussi
        this.error = '';
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur lors du chargement des commandes', error);
        
        if (error && error.status) {
          console.error('Statut HTTP:', error.status, error.statusText);
          console.error('URL qui a échoué:', error.url);
          
          if (error.status === 0) {
            this.error = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet et que le serveur backend est en cours d\'exécution.';
          } else if (error.status === 401) {
            this.error = 'Session expirée. Veuillez vous reconnecter.';
            this.authService.logout();
          } else if (error.status === 403) {
            this.error = 'Vous n\'avez pas les permissions nécessaires pour accéder aux commandes.';
          } else if (error.status === 404) {
            this.error = 'L\'API des commandes n\'existe pas. Vérifiez l\'URL configurée dans le service.';
          } else if (error.status === 500) {
            this.error = 'Le serveur a rencontré une erreur interne. Veuillez contacter l\'administrateur.';
          } else {
            this.error = `Impossible de charger les commandes: ${error.message}`;
          }
        } else {
          this.error = 'Une erreur inconnue est survenue lors du chargement des commandes';
        }
        
        this.loading = false;
      },
      complete: () => {
        console.log('Chargement des commandes terminé');
      }
    });
  }

  refreshOrders(): void {
    this.loadOrders();
  }

  viewOrderDetails(order: Order): void {
    this.selectedOrder = order;
    this.showModal = true;
  }

  closeModal(): void {
    this.selectedOrder = null;
    this.showModal = false;
  }

  deleteOrder(orderId: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette commande ? Cette action est irréversible.')) {
      this.loading = true;
      
      // Trouver l'élément à supprimer
      const orderElement = document.querySelector(`tr[data-order-id="${orderId}"]`);
      if (orderElement) {
        orderElement.classList.add('deleting');
      }
      
      this.orderService.deleteOrder(orderId).subscribe({
        next: () => {
          // Supprimer la commande de la liste
          this.orders = this.orders.filter(order => order.id !== orderId);
          
          // Afficher un message de confirmation
          this.showNotification('Commande supprimée avec succès', 'success');
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.error = 'Erreur lors de la suppression de la commande';
          this.showNotification('Erreur lors de la suppression de la commande', 'error');
          this.loading = false;
          
          // Retirer la classe d'animation en cas d'erreur
          if (orderElement) {
            orderElement.classList.remove('deleting');
          }
        }
      });
    }
  }

  updateStatus(orderId: number, newStatus: string): void {
    this.markAsModified();
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: (updatedOrder) => {
        // Mettre à jour l'ordre dans la liste
        const index = this.orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
          this.orders[index] = updatedOrder;
        }
        
        // Si cet ordre est actuellement sélectionné, mettre à jour aussi
        if (this.selectedOrder && this.selectedOrder.id === orderId) {
          this.selectedOrder = updatedOrder;
        }
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du statut', error);
      }
    });
  }
  
  // Retourne les commandes filtrées par statut
  get filteredOrders(): Order[] {
    return this.statusFilter 
      ? this.orders.filter(order => order.status === this.statusFilter)
      : this.orders;
  }
  
  // Classes conditionnelles pour le statut
  getStatusClass(status: string): string {
    switch(status) {
      case 'pending': return 'status-pending';
      case 'processing': return 'status-processing';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      case 'cancelled': return 'status-cancelled';
      default: return '';
    }
  }

  // Ajouter la méthode search
  search(): void {
    // Réinitialiser le filtre par statut pour une recherche complète
    // La logique de filtrage est déjà implémentée dans le getter filteredOrders
  }

  // Ajouter la méthode isAdmin
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  // Ajouter la méthode setupAutoRefresh
  setupAutoRefresh(): void {
    // Vérifier les nouvelles commandes toutes les 30 secondes
    this.refreshSubscription = interval(30000).pipe(
      switchMap(() => this.orderService.getOrders())
    ).subscribe({
      next: (data) => {
        // Vérifier s'il y a de nouvelles commandes
        if (data.length > this.orderCount) {
          this.hasNewOrders = true;
          
          // Afficher une notification
          const newOrdersCount = data.length - this.orderCount;
          this.showNotification(`${newOrdersCount} nouvelle${newOrdersCount > 1 ? 's' : ''} commande${newOrdersCount > 1 ? 's' : ''} reçue${newOrdersCount > 1 ? 's' : ''}!`, 'info');
          
          // Mettre à jour les commandes silencieusement
          this.orders = data;
          this.orderCount = data.length;
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification des nouvelles commandes', error);
      }
    });
  }

  // Ajouter la méthode loadAvailableLivreurs
  loadAvailableLivreurs(): void {
    // Implémenter la récupération des livreurs disponibles depuis le service
    // Pour l'instant, utilisons des données fictives
    this.availableLivreurs = [
      { id: 1, name: 'Livreur 1' },
      { id: 2, name: 'Livreur 2' },
      { id: 3, name: 'Livreur 3' }
    ];
  }

  // Ajouter la méthode assignLivreur
  assignLivreur(orderId: number): void {
    this.markAsModified();
    if (!this.selectedLivreur) {
      console.error('Aucun livreur sélectionné');
      return;
    }

    this.orderService.assignLivreur(orderId, this.selectedLivreur).subscribe({
      next: (updatedOrder: Order) => {
        console.log('Livreur assigné avec succès:', updatedOrder);
        this.loadOrders();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur lors de l\'assignation du livreur:', error);
      }
    });
  }

  // Ajouter la méthode showNotification
  showNotification(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Animation d'apparition
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // Animation de disparition
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 5000);
  }

  // Ajouter la méthode pour réinitialiser le livreur
  resetOrderLivreur(order: Order): void {
    // Créer une copie de la commande avec le livreur défini comme undefined
    this.selectedOrder = {
      ...order,
      livreur: undefined
    };
  }
  
  // Méthodes utilitaires pour les calculs dans le template
  
  // Calculer le sous-total des produits d'une commande
  getOrderSubtotal(order: Order): number {
    if (!order || !order.items || order.items.length === 0) return 0;
    return order.items.reduce((sum, item) => sum + item.subtotal, 0);
  }
  
  // Calculer la TVA d'une commande
  getOrderTax(order: Order): number {
    return this.getOrderSubtotal(order) * 0.2;
  }
  
  // Calculer les frais de livraison d'une commande
  getOrderShipping(order: Order): number {
    return this.getOrderSubtotal(order) >= 50 ? 0 : 5;
  }
  
  // Formatter un montant pour l'affichage
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }

  // Method to mark that modifications have been made
  markAsModified(): void {
    this.hasModifications = true;
  }

  // Method to save all modifications
  saveChanges(): void {
    if (!this.hasModifications) {
      this.showNotification('Aucune modification à enregistrer', 'info');
      return;
    }

    this.loading = true;
    this.error = '';

    // Save changes for the selected order if it exists
    if (this.selectedOrder) {
      this.orderService.updateOrder(this.selectedOrder.id, this.selectedOrder).subscribe({
        next: (updatedOrder) => {
          // Update the order in the list
          const index = this.orders.findIndex(o => o.id === updatedOrder.id);
          if (index !== -1) {
            this.orders[index] = updatedOrder;
          }
          this.hasModifications = false;
          this.loading = false;
          this.showNotification('Modifications enregistrées avec succès', 'success');
          this.closeModal();
        },
        error: (error) => {
          this.loading = false;
          this.error = 'Erreur lors de l\'enregistrement des modifications';
          this.showNotification('Erreur lors de l\'enregistrement des modifications', 'error');
          console.error('Erreur lors de la sauvegarde:', error);
        }
      });
    }
  }
}
