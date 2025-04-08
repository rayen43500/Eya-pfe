import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PromotionService, Promotion } from '../../services/promotion.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthAdminService } from '../../services/auth-admin.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-promotions',
  standalone: false,
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.css'
})
export class PromotionsComponent implements OnInit {
  promotions: Promotion[] = [];
  filteredPromotions: Promotion[] = [];
  promotionForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  searchTerm = '';
  selectedType = '';
  selectedStatus = '';
  showModal = false;
  isEditing = false;
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  selectedPromotion: Promotion | null = null;
  
  // Variables pour les promotions
  globalPromotion = { discountPercentage: 10 };
  categoryPromotion = { category: '', discountPercentage: 15 };
  categories: string[] = [];
  productsOnPromotion: any[] = [];
  categorySubmitted = false;
  
  // Notification
  showNotification = false;
  notificationMessage = '';
  notificationSuccess = true;
  
  // URL de l'API
  private apiUrl = environment.production 
    ? 'https://votre-domaine.com/api' 
    : 'http://localhost:8000/api';

  constructor(
    private promotionService: PromotionService,
    private fb: FormBuilder,
    private http: HttpClient,
    private authAdminService: AuthAdminService,
    private router: Router
  ) {
    this.promotionForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(50)]],
      description: ['', [Validators.required, Validators.maxLength(100)]],
      details: [''],
      type: ['percentage', Validators.required],
      value: [null],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required],
      usage_limit: [0],
      status: ['active'],
      code_prefix: ['PROMO']
    });
    
    // Make value required when type is not free_shipping
    this.promotionForm.get('type')?.valueChanges.subscribe(type => {
      const valueControl = this.promotionForm.get('value');
      if (type === 'free_shipping') {
        valueControl?.clearValidators();
      } else {
        valueControl?.setValidators([Validators.required]);
      }
      valueControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.checkAuthentication();
    this.loadPromotions();
    this.loadCategories();
    this.loadProductsOnPromotion();
  }

  // Vérification de l'authentification
  checkAuthentication(): void {
    // Désactivé pour permettre l'accès direct sans authentification
    console.log('Accès direct aux promotions sans vérification d\'authentification');
    // Pas de redirection ni de vérification de token
  }

  loadPromotions(): void {
    this.loading = true;
    
    const params: any = {};
    if (this.selectedType) params.type = this.selectedType;
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.searchTerm) params.search = this.searchTerm;
    
    this.promotionService.getPromotions(params).subscribe(
      (data) => {
        this.promotions = data;
        this.applyPagination();
        this.loading = false;
      },
      (error) => {
        console.error('Erreur lors du chargement des promotions', error);
        this.error = 'Impossible de charger les promotions';
        this.loading = false;
      }
    );
  }

  applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.filteredPromotions = this.promotions.slice(startIndex, endIndex);
    this.totalItems = this.promotions.length;
  }
  
  setPage(page: number): void {
    this.currentPage = page;
    this.applyPagination();
  }

  onSearch(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
    this.loadPromotions();
  }

  onFilterType(type: string): void {
    this.selectedType = type;
    this.currentPage = 1;
    this.loadPromotions();
  }

  onFilterStatus(status: string): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.loadPromotions();
  }

  openModal(promotion?: Promotion): void {
    this.resetAlerts();
    
    if (promotion) {
      // Mode édition
      this.isEditing = true;
      this.selectedPromotion = promotion;
      
      // Format dates for form
      const startDate = new Date(promotion.start_date).toISOString().split('T')[0];
      const endDate = new Date(promotion.end_date).toISOString().split('T')[0];
      
      this.promotionForm.patchValue({
        code: promotion.code,
        description: promotion.description,
        details: promotion.details,
        type: promotion.type,
        value: promotion.value,
        start_date: startDate,
        end_date: endDate,
        usage_limit: promotion.usage_limit,
        status: promotion.status
      });
      
      // Disable code field in edit mode
      this.promotionForm.get('code')?.disable();
    } else {
      // Mode création
      this.isEditing = false;
      this.selectedPromotion = null;
      this.promotionForm.reset({
        type: 'percentage',
        usage_limit: 0,
        status: 'active'
      });
      
      // Enable code field in create mode
      this.promotionForm.get('code')?.enable();
    }
    
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.promotionForm.reset();
  }

  savePromotion(): void {
    if (this.promotionForm.invalid) {
      console.error('Formulaire invalide:', this.promotionForm.errors);
      return;
    }
    
    this.loading = true;
    console.log('Envoi du formulaire:', this.promotionForm.value);
    
    // Préparer les données
    const formData = {...this.promotionForm.value};
    
    // Handle special case for free shipping
    if (formData.type === 'free_shipping') {
      formData.value = 0;
    }
    
    console.log('Données préparées:', formData);
    
    if (this.isEditing && this.selectedPromotion) {
      // Update promotion
      this.promotionService.updatePromotion(
        this.selectedPromotion.id, 
        formData
      ).subscribe(
        (updatedPromotion) => {
          const index = this.promotions.findIndex(p => p.id === this.selectedPromotion?.id);
          if (index !== -1) {
            this.promotions[index] = updatedPromotion;
          }
          this.success = 'Promotion mise à jour avec succès';
          this.loading = false;
          this.closeModal();
          this.applyPagination();
        },
        (error) => {
          console.error('Erreur lors de la mise à jour de la promotion', error);
          this.error = 'Erreur lors de la mise à jour de la promotion';
          this.loading = false;
        }
      );
    } else {
      this.promotionService.createPromotion(formData).subscribe(
        (newPromotion) => {
          console.log('Promotion créée avec succès:', newPromotion);
          this.promotions.unshift(newPromotion);
          this.success = 'Promotion créée avec succès';
          this.loading = false;
          this.closeModal();
          this.currentPage = 1;
          this.applyPagination();
        },
        (error) => {
          console.error('Erreur détaillée:', error);
          this.error = 'Erreur lors de la création de la promotion';
          this.loading = false;
        }
      );
    }
  }

  deletePromotion(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      this.loading = true;
      this.promotionService.deletePromotion(id).subscribe(
        () => {
          this.promotions = this.promotions.filter(p => p.id !== id);
          this.success = 'Promotion supprimée avec succès';
          this.loading = false;
          this.applyPagination();
        },
        (error) => {
          console.error('Erreur lors de la suppression de la promotion', error);
          this.error = 'Erreur lors de la suppression de la promotion';
          this.loading = false;
        }
      );
    }
  }

  toggleStatus(promotion: Promotion): void {
    const action = promotion.status === 'active' 
      ? this.promotionService.deactivatePromotion(promotion.id)
      : this.promotionService.activatePromotion(promotion.id);
    
    action.subscribe(
      () => {
        promotion.status = promotion.status === 'active' ? 'inactive' : 'active';
        promotion.status_display = promotion.status === 'active' ? 'Active' : 'Inactive';
      },
      (error) => {
        console.error('Erreur lors du changement de statut', error);
        this.error = 'Erreur lors du changement de statut';
      }
    );
  }

  resetAlerts(): void {
    this.error = '';
    this.success = '';
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'scheduled': return 'status-scheduled';
      case 'expired': return 'status-expired';
      default: return '';
    }
  }
  
  getPageNumbers(): number[] {
    const pageCount = Math.ceil(this.totalItems / this.itemsPerPage);
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }

  generateCode(): void {
    // Préfixe de base + date actuelle (année/mois)
    const date = new Date();
    const prefix = `PROMO${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    
    // Génération de 4 caractères aléatoires
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
      randomPart += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    // Attribution du code généré au formulaire
    this.promotionForm.get('code')?.setValue(`${prefix}${randomPart}`);
  }

  // Charger les catégories de produits
  loadCategories(): void {
    this.http.get<string[]>(`${this.apiUrl}/products/categories/`)
      .subscribe({
        next: (categories) => {
          this.categories = categories;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des catégories:', error);
          this.showNotificationMessage('Erreur lors du chargement des catégories.', false);
        }
      });
  }

  // Charger les produits en promotion
  loadProductsOnPromotion(): void {
    this.http.get<any[]>(`${this.apiUrl}/products/`)
      .subscribe({
        next: (products) => {
          // Filtre les produits qui ont une promotion active
          this.productsOnPromotion = products.filter(p => p.is_on_promotion && p.discount_percentage > 0);
          // Tri par pourcentage de réduction décroissant
          this.productsOnPromotion.sort((a, b) => b.discount_percentage - a.discount_percentage);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des produits:', error);
          this.showNotificationMessage('Erreur lors du chargement des produits.', false);
        }
      });
  }

  // Appliquer une promotion à tous les produits
  applyPromotionToAll(): void {
    // Validation du pourcentage de réduction
    if (this.globalPromotion.discountPercentage <= 0 || this.globalPromotion.discountPercentage > 99) {
      this.showNotificationMessage('Le pourcentage de réduction doit être entre 1 et 99%.', false);
      return;
    }

    // Activation de l'indicateur de chargement
    this.loading = true;
    
    // Créer un objet FormData au lieu de JSON
    const formData = new FormData();
    formData.append('discount_percentage', this.globalPromotion.discountPercentage.toString());
    
    // Log pour déboguer
    console.log('Application d\'une promotion globale avec le pourcentage:', this.globalPromotion.discountPercentage);

    this.http.post(`${this.apiUrl}/products/apply_promotion_all/`, formData).subscribe({
      next: (response: any) => {
        console.log('Réponse du serveur:', response);
        this.showNotificationMessage('Promotion appliquée à tous les produits avec succès!', true);
        // Rechargement des produits après l'application de la promotion
        this.loadProductsOnPromotion();
        
        // Désactivation de l'indicateur de chargement
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'application de la promotion:', error);
        console.error('Détails de l\'erreur:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.detail || error.error?.error || error.message
        });
        
        // Autres erreurs
        const errorMessage = error.error?.detail || error.error?.error || 'Erreur lors de l\'application de la promotion.';
        this.showNotificationMessage(errorMessage, false);
        
        // Désactivation de l'indicateur de chargement
        this.loading = false;
      }
    });
  }

  // Appliquer une promotion à une catégorie spécifique
  applyPromotionToCategory(): void {
    this.categorySubmitted = true;
    
    // Vérification de la sélection d'une catégorie
    if (!this.categoryPromotion.category) {
      this.showNotificationMessage('Veuillez sélectionner une catégorie.', false);
      return;
    }
    
    // Validation du pourcentage de réduction
    if (this.categoryPromotion.discountPercentage <= 0 || this.categoryPromotion.discountPercentage > 99) {
      this.showNotificationMessage('Le pourcentage de réduction doit être entre 1 et 99%.', false);
      return;
    }

    // Activation de l'indicateur de chargement
    this.loading = true;
    
    // Créer un objet FormData au lieu de JSON
    const formData = new FormData();
    formData.append('discount_percentage', this.categoryPromotion.discountPercentage.toString());
    formData.append('category', this.categoryPromotion.category);
    
    // Log pour déboguer
    console.log('Envoi de la requête pour la catégorie:', this.categoryPromotion.category);
    console.log('Pourcentage de réduction:', this.categoryPromotion.discountPercentage);
    
    this.http.post(`${this.apiUrl}/products/apply_promotion_category/`, formData).subscribe({
      next: (response: any) => {
        console.log('Réponse du serveur:', response);
        this.showNotificationMessage(`Promotion appliquée à la catégorie ${this.categoryPromotion.category} avec succès!`, true);
        this.loadProductsOnPromotion();
        this.categorySubmitted = false; // Réinitialiser après succès
        
        // Réinitialiser le formulaire pour une nouvelle promotion
        this.categoryPromotion = { category: '', discountPercentage: 15 };
        
        // Désactivation de l'indicateur de chargement
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'application de la promotion:', error);
        console.error('Détails de l\'erreur:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.detail || error.error?.error || error.message
        });
        
        // Autres erreurs
        const errorMessage = error.error?.detail || error.error?.error || 'Erreur lors de l\'application de la promotion.';
        this.showNotificationMessage(errorMessage, false);
        
        this.categorySubmitted = false; // Réinitialiser après erreur
        // Désactivation de l'indicateur de chargement
        this.loading = false;
      }
    });
  }

  // Supprimer toutes les promotions
  removeAllPromotions(): void {
    // Demander confirmation avant de procéder
    if (!confirm('Êtes-vous sûr de vouloir supprimer toutes les promotions ? Cette action est irréversible.')) {
      return;
    }

    // Activation de l'indicateur de chargement
    this.loading = true;
    
    // FormData vide (aucun paramètre nécessaire pour cette action)
    const formData = new FormData();
    
    // Log pour déboguer
    console.log('Suppression de toutes les promotions');

    this.http.post(`${this.apiUrl}/promotions/remove-all/`, formData).subscribe({
      next: (response: any) => {
        console.log('Réponse du serveur:', response);
        this.showNotificationMessage('Toutes les promotions ont été supprimées avec succès.', true);
        // Rechargement des données
        this.loadPromotions();
        this.loadProductsOnPromotion();
        
        // Désactivation de l'indicateur de chargement
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la suppression des promotions:', error);
        console.error('Détails de l\'erreur:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.detail || error.error?.error || error.message
        });
        
        // Autres erreurs
        const errorMessage = error.error?.detail || error.error?.error || 'Erreur lors de la suppression des promotions.';
        this.showNotificationMessage(errorMessage, false);
        
        // Désactivation de l'indicateur de chargement
        this.loading = false;
      }
    });
  }

  // Afficher une notification
  showNotificationMessage(message: string, success: boolean): void {
    this.notificationMessage = message;
    this.notificationSuccess = success;
    this.showNotification = true;
    
    // Masquer la notification après 3 secondes
    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }
}
