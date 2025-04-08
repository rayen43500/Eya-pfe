import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProductService, Product } from '../../services/product.service';

@Component({
  selector: 'app-produits',
  templateUrl: './produits.component.html',
  styleUrls: ['./produits.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule]
})
export class ProduitsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  loading = false;
  error = '';
  productAdded = false;
  
  // Filtres
  categories: string[] = [];
  activeCategory: string = 'all';
  searchTerm: string = '';
  priceFilter: number = 0;
  maxPrice: number = 1000;
  sortOption: string = 'nameAsc';
  filtersActive: boolean = false;
  
  // Mapping des catégories
  categoryLabels: {[key: string]: string} = {
    'electronics': 'Électronique',
    'fashion': 'Mode',
    'home': 'Maison',
    'beauty': 'Beauté',
    // Ajoutez d'autres catégories selon vos besoins
  };

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private productService: ProductService
  ) {}

  ngOnInit(): void {
    // Vérifier si on revient d'un ajout de produit
    this.route.queryParams.subscribe(params => {
      if (params['added'] === 'true') {
        this.productAdded = true;
        setTimeout(() => {
          this.productAdded = false;
        }, 5000);
      }
    });

    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    this.productService.getProducts().subscribe(
      (data: any) => {
        this.products = data.results || data;
        this.filteredProducts = [...this.products];
        
        // Extraire les catégories uniques
        this.categories = [...new Set(this.products.map(p => p.category))];
        
        // Déterminer le prix maximum
        if (this.products.length > 0) {
          this.maxPrice = Math.ceil(Math.max(...this.products.map(p => p.price))) + 100;
          this.priceFilter = this.maxPrice;
        }
        
        this.loading = false;
      },
      error => {
        console.error('Erreur lors du chargement des produits', error);
        this.error = 'Impossible de charger les produits';
        this.loading = false;
      }
    );
  }
  
  // Méthodes pour le filtrage
  
  filterByCategory(event: any) {
    this.activeCategory = event.target.value;
    this.applyFilters();
  }
  
  filterByPrice() {
    this.applyFilters();
  }
  
  filterBySearch() {
    this.applyFilters();
  }
  
  sortProducts(event: any) {
    this.sortOption = event.target.value;
    this.applyFilters();
  }
  
  applyFilters() {
    let filtered = [...this.products];
    
    // Filtre par catégorie
    if (this.activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category === this.activeCategory);
    }
    
    // Filtre par prix
    if (this.priceFilter < this.maxPrice) {
      filtered = filtered.filter(p => p.price <= this.priceFilter);
    }
    
    // Filtre par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.description.toLowerCase().includes(term)
      );
    }
    
    // Tri
    filtered = this.sortProductsArray(filtered, this.sortOption);
    
    this.filteredProducts = filtered;
    
    // Vérifier si des filtres sont actifs
    this.filtersActive = this.activeCategory !== 'all' || 
                         this.priceFilter < this.maxPrice || 
                         this.searchTerm.trim() !== '';
  }
  
  sortProductsArray(products: Product[], option: string): Product[] {
    switch(option) {
      case 'nameAsc':
        return [...products].sort((a, b) => a.name.localeCompare(b.name));
      case 'nameDesc':
        return [...products].sort((a, b) => b.name.localeCompare(a.name));
      case 'priceAsc':
        return [...products].sort((a, b) => a.price - b.price);
      case 'priceDesc':
        return [...products].sort((a, b) => b.price - a.price);
      case 'newest':
        return [...products].sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
      case 'oldest':
        return [...products].sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateA - dateB;
        });
      default:
        return products;
    }
  }
  
  resetFilters() {
    this.activeCategory = 'all';
    this.priceFilter = this.maxPrice;
    this.searchTerm = '';
    this.sortOption = 'nameAsc';
    this.filteredProducts = [...this.products];
    this.filtersActive = false;
  }
  
  clearCategoryFilter() {
    this.activeCategory = 'all';
    this.applyFilters();
  }
  
  clearPriceFilter() {
    this.priceFilter = this.maxPrice;
    this.applyFilters();
  }
  
  clearSearch() {
    this.searchTerm = '';
    this.applyFilters();
  }
  
  getCategoryLabel(category: string): string {
    return this.categoryLabels[category] || category;
  }

  addProduct(): void {
    this.router.navigate(['/ajouter-produit']);
  }

  editProduct(productId: number): void {
    this.router.navigate(['/modifier-produit', productId]);
  }

  deleteProduct(productId: number): void {
    console.log(`Suppression du produit ${productId}`);
    // Afficher une confirmation avant la suppression
  }

  getImageUrl(imagePath: string | null): string {
    if (!imagePath) return '';
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    if (imagePath.startsWith('/')) {
      return `http://localhost:8000${imagePath}`;
    }
    
    return `http://localhost:8000/${imagePath}`;
  }

  handleImageError(event: any): void {
    event.target.src = 'assets/images/no-image.png';
  }

  getStatusLabel(status: string): string {
    const statusLabels: {[key: string]: string} = {
      'available': 'Disponible',
      'out_of_stock': 'Épuisé',
      'hidden': 'Non visible'
    };
    
    return statusLabels[status] || status;
  }
}
