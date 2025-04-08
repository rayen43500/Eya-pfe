import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

// Import du service d'authentification client
import { AuthClientService } from '../../../services/auth-client.service';
import { CartService, CartItem } from '../../../services/cart.service';
import { Product, ProductService } from '../../../services/product.service';
import { CategoryService, Category } from '../../../services/category.service';

@Component({
  selector: 'app-shoop-bord',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    RouterModule
  ],
  templateUrl: './shoop-bord.component.html',
  styleUrl: './shoop-bord.component.css'
})
export class ShoopBordComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  displayedProducts: Product[] = []; // Produits affichés sur la page actuelle
  categories: Category[] = [];
  categoriesSubscription: Subscription | null = null;
  loading = true;
  error: string | null = null;
  selectedCategory: string = 'all';
  searchControl = new FormControl('');
  priceRange = [0, 1000];
  maxPrice = 1000;
  sortOption = 'default';
  cartItems: CartItem[] = [];
  showCartComponent: boolean = false;
  isDevMode = true; // Mode développement
  shippingCost: number = 5.99; // Coût de livraison standard
  
  // Propriétés de pagination
  currentPage: number = 1;
  itemsPerPage: number = 9;
  totalPages: number = 1;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private authClientService: AuthClientService,
    private cartService: CartService,
    private productService: ProductService,
    private categoryService: CategoryService
  ) {}

  ngOnInit(): void {
    console.log('===== ShoopBordComponent initialisé =====');
    console.log('URL actuelle:', window.location.href);
    
    // Vérification de l'authentification
    if (!this.isDevMode && !this.authClientService.isClientAuthenticated()) {
      console.log('Utilisateur non authentifié, redirection vers la page de connexion');
      this.router.navigate(['/login-client']);
      return;
    }
    
    if (this.authClientService.isClientAuthenticated()) {
      console.log('✅ Utilisateur authentifié :', this.authClientService.getClientUserFromStorage());
      console.log('🔑 Token présent :', !!this.authClientService.getClientToken());
    } else {
      console.log('⚠️ Mode développement: bypass authentification activé');
    }
    
    // Vérifier s'il y a un paramètre de succès de commande
    this.route.queryParams.subscribe(params => {
      if (params['orderSuccess'] === 'true') {
        const orderId = params['orderId'];
        this.showNotification(`Votre commande #${orderId} a été confirmée avec succès!`, 5000);
      }
      
      // Ajouter vérification du paramètre de page
      if (params['page']) {
        this.currentPage = parseInt(params['page'], 10) || 1;
      }
    });
    
    // Chargement des catégories
    this.loadCategories();
    
    console.log('Chargement des produits...');
    this.loadProducts();
    
    this.searchControl.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(term => {
        this.filterProducts();
      });
      
    // Récupérer le panier depuis le service CartService
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  loadCategories(): void {
    this.categoriesSubscription = this.categoryService.getCategories().subscribe(
      categories => {
        this.categories = categories;
        console.log('Catégories chargées:', this.categories);
      },
      error => {
        console.error('Erreur lors du chargement des catégories', error);
      }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.authClientService.getClientToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.error = null;
    
    const headers = this.getAuthHeaders();
    this.http.get<Product[]>('http://localhost:8000/api/products/', { headers })
      .subscribe({
        next: (data) => {
          console.log('Produits reçus:', data);
          console.log('Nombre de produits reçus:', data.length);
          
          // Calculer les prix finaux avec remise
          this.products = data.map(product => {
            // Gestion correcte des images
            let imageUrl = 'assets/images/placeholder.png';
            
            if (product.image) {
              // Si l'image est une URL complète, l'utiliser telle quelle
              if (product.image.startsWith('http')) {
                imageUrl = product.image;
              } 
              // Si c'est un chemin relatif à /media/, construire l'URL complète
              else {
                // Supprimer le premier slash s'il existe pour éviter une double barre
                const imagePath = product.image.startsWith('/') ? product.image.substring(1) : product.image;
                imageUrl = `http://localhost:8000/media/${imagePath}`;
              }
            }
            
            return {
              ...product,
              image: imageUrl,
              // Calculer le prix final si une remise est appliquée
              final_price: product.discount_percentage ? 
                product.price * (1 - (product.discount_percentage / 100)) : 
                product.price
            };
          });
          
          // Déterminer le prix maximum pour le filtre
          this.maxPrice = Math.max(...this.products.map(p => p.price));
          this.priceRange = [0, this.maxPrice];
          
          this.filteredProducts = [...this.products];
          this.loading = false;
          
          console.log('Produits chargés avec succès. Total:', this.products.length);
          
          // Initialiser explicitement la pagination
          this.updatePagination();
          console.log('Pagination initialisée avec', this.itemsPerPage, 'produits par page');
        },
        error: (err) => {
          console.error('Erreur lors du chargement des produits', err);
          this.error = 'Impossible de charger les produits. Veuillez réessayer plus tard.';
          this.loading = false;
        }
      });
  }

  filterProducts(): void {
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    
    this.filteredProducts = this.products.filter(product => {
      // Filtre par catégorie
      const categoryMatch = this.selectedCategory === 'all' || product.category === this.selectedCategory;
      
      // Filtre par terme de recherche
      const searchMatch = 
        product.name.toLowerCase().includes(searchTerm) || 
        product.description.toLowerCase().includes(searchTerm);
      
      // Filtre par prix
      const priceMatch = 
        (product.final_price || product.price) >= this.priceRange[0] && 
        (product.final_price || product.price) <= this.priceRange[1];
      
      // Tous les filtres doivent correspondre
      return categoryMatch && searchMatch && priceMatch;
    });
    
    // Tri des produits
    this.sortProducts();
    
    // Mettre à jour la pagination
    this.updatePagination();
  }

  sortProducts(): void {
    switch(this.sortOption) {
      case 'price-asc':
        this.filteredProducts.sort((a, b) => 
          (a.final_price || a.price) - (b.final_price || b.price));
        break;
      case 'price-desc':
        this.filteredProducts.sort((a, b) => 
          (b.final_price || b.price) - (a.final_price || a.price));
        break;
      case 'name-asc':
        this.filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        this.filteredProducts.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'rating':
        this.filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        // Default sorting (newest)
        this.filteredProducts.sort((a, b) => b.id - a.id);
    }
    
    // Mettre à jour la pagination après le tri
    this.updatePagination();
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.filterProducts();
  }

  changePriceRange(event: any): void {
    this.priceRange = event.target.value;
    this.filterProducts();
  }

  changeSortOption(event: any): void {
    this.sortOption = event.target.value;
    this.sortProducts();
  }

  addToCart(product: Product): void {
    console.log('Tentative d\'ajout au panier:', product.name);
    
    // Vérifier si le produit est disponible et en stock
    if (product.stock <= 0) {
      console.log('Produit non disponible en stock');
      this.showNotification(`${product.name} n'est pas disponible en stock`, 3000, 'error');
      return;
    }
    
    // Obtenir le panier actuel
    const currentCart = this.cartService.getCartItems();
    const existingItem = currentCart.find(item => item.product.id === product.id);
    let newQuantity = 1;
    
    if (existingItem) {
      // Le produit existe déjà, calculer la nouvelle quantité
      newQuantity = existingItem.quantity + 1;
      
      // Vérifier si la nouvelle quantité dépasse le stock
      if (newQuantity > product.stock) {
        this.showNotification(`Stock maximum atteint pour ${product.name}`, 3000, 'error');
        return;
      }
    }
    
    // Récupérer la version la plus récente des items du panier
    const updatedCart = [...currentCart];
    
    if (existingItem) {
      // Mettre à jour la quantité d'un article existant
      const itemIndex = updatedCart.findIndex(item => item.product.id === product.id);
      updatedCart[itemIndex].quantity = newQuantity;
    } else {
      // Ajouter un nouvel article
      updatedCart.push({ product, quantity: 1 });
    }
    
    // Sauvegarder le panier mis à jour
    localStorage.setItem('cartItems', JSON.stringify(updatedCart));
    
    // Rafraîchir l'observable du panier
    (this.cartService as any).cartItemsSubject.next(updatedCart);
    
    // Afficher un message de notification
    this.showNotification(`${product.name} ajouté au panier`);
  }

  removeFromCart(productId: number): void {
    this.cartService.removeFromCart(productId);
  }

  updateQuantity(productId: number, change: number): void {
    this.cartService.updateQuantity(productId, change);
  }

  toggleCart(): void {
    this.showCartComponent = !this.showCartComponent;
  }

  closeCartComponent(): void {
    this.showCartComponent = false;
  }

  getCartSubtotal(): number {
    return this.cartItems.reduce((total, item) => {
      const itemPrice = item.product.final_price || item.product.price;
      return total + (itemPrice * item.quantity);
    }, 0);
  }

  getCartTotal(): number {
    const subtotal = this.getCartSubtotal();
    return this.cartItems.length > 0 ? subtotal + this.shippingCost : subtotal;
  }

  getCartItemCount(): number {
    return this.cartService.getCartItemCount();
  }

  checkout(): void {
    // Rediriger vers la page de checkout
    this.router.navigate(['/checkout']);
  }

  showNotification(message: string, duration: number = 3000, type: string = 'success'): void {
    // Implémentation simple de notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, duration);
  }

  // Ajouter cette méthode pour gérer la pagination
  updatePagination(): void {
    // Calculer le nombre total de pages
    this.totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
    
    // Si la page actuelle est supérieure au nombre total de pages, revenir à la page 1
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
    
    // Calculer les indices de début et de fin pour la page actuelle
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredProducts.length);
    
    // Extraire les produits à afficher pour la page actuelle
    this.displayedProducts = this.filteredProducts.slice(startIndex, endIndex);
    
    // Log pour vérification
    console.log(`Pagination: ${this.filteredProducts.length} produits au total, ${this.totalPages} pages, page actuelle: ${this.currentPage}, produits affichés: ${this.displayedProducts.length}`);
  }

  // Ajouter cette méthode pour changer de page
  changePage(pageNumber: number): void {
    this.currentPage = pageNumber;
    this.updatePagination();
    // Défiler vers le haut de la page pour une meilleure expérience utilisateur
    window.scrollTo(0, 0);
  }

  // Ajouter cette méthode pour obtenir un tableau de numéros de pages pour l'affichage
  getPagesArray(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Ajouter cette méthode pour la pagination précédente
  previousPage(): void {
    if (this.currentPage > 1) {
      this.changePage(this.currentPage - 1);
    }
  }

  // Ajouter cette méthode pour la pagination suivante
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.changePage(this.currentPage + 1);
    }
  }

  // Ajouter cette méthode pour le calcul de l'élément de fin
  getLastDisplayedIndex(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.filteredProducts.length);
  }

  ngOnDestroy(): void {
    if (this.categoriesSubscription) {
      this.categoriesSubscription.unsubscribe();
    }
  }
  
  getCategoryIcon(categoryName: string): string {
    // Recherche de l'icône dans la liste des catégories
    const category = this.categories.find(c => c.name === categoryName);
    if (category && category.icon) {
      return category.icon;
    }
    
    // Icônes par défaut basées sur des noms communs
    switch(categoryName?.toLowerCase()) {
      case 'electronics':
      case 'électronique':
        return 'fa-laptop';
      case 'fashion':
      case 'mode':
        return 'fa-tshirt';
      case 'home':
      case 'maison':
        return 'fa-home';
      case 'beauty':
      case 'beauté':
        return 'fa-spa';
      case 'books':
      case 'livres':
        return 'fa-book';
      case 'sports':
      case 'sport':
        return 'fa-running';
      case 'food':
      case 'alimentation':
      case 'nourriture':
        return 'fa-utensils';
      default:
        return 'fa-tag'; // Icône par défaut
    }
  }
}
