import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthClientService } from './auth-client.service';
import { Router } from '@angular/router';
import { OrderService, CreateOrderRequest } from './order.service';
import { ProductService, Product } from './product.service';
import { catchError, switchMap, tap } from 'rxjs/operators';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'cartItems';
  private apiUrl = 'http://localhost:8000/api';
  
  private cartItemsSubject = new BehaviorSubject<CartItem[]>(this.loadCartFromStorage());
  public cartItems$ = this.cartItemsSubject.asObservable();
  
  constructor(
    private http: HttpClient,
    private authClientService: AuthClientService,
    private orderService: OrderService,
    private productService: ProductService,
    private router: Router
  ) {
    // Charger le panier initial et vérifier le stock actuel
    this.refreshCartItems();
  }
  
  // Charger le panier depuis le localStorage
  private loadCartFromStorage(): CartItem[] {
    const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : [];
  }
  
  // Sauvegarder le panier dans le localStorage
  private saveCartToStorage(items: CartItem[]): void {
    localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(items));
  }
  
  // Rafraîchir les produits du panier avec les informations à jour
  refreshCartItems(): void {
    const cartItems = this.loadCartFromStorage();
    
    // Si le panier est vide, pas besoin de rafraîchir
    if (cartItems.length === 0) {
      this.cartItemsSubject.next([]);
      return;
    }
    
    // Pour chaque produit dans le panier, vérifier sa disponibilité et son stock
    const productIds = cartItems.map(item => item.product.id);
    
    // Mise à jour des éléments individuellement à partir du service de produits
    const updatedCart: CartItem[] = [];
    let hasChanges = false;
    
    // Pour chaque élément, récupérer les informations produit actualisées
    cartItems.forEach(item => {
      this.productService.getProductById(item.product.id).subscribe({
        next: (product) => {
          // Vérifier si le produit est disponible
          if (!product.is_available) {
            console.log(`Produit ${product.name} n'est plus disponible, retiré du panier`);
            hasChanges = true;
            return; // Ne pas ajouter au panier mis à jour
          }
          
          // Vérifier le stock disponible
          const newQuantity = Math.min(item.quantity, product.stock);
          if (newQuantity !== item.quantity) {
            console.log(`Stock ajusté pour ${product.name} (${item.quantity} → ${newQuantity})`);
            hasChanges = true;
          }
          
          if (newQuantity > 0) {
            updatedCart.push({
              product: product,
              quantity: newQuantity
            });
          }
          
          // Si c'est le dernier produit vérifié, mettre à jour le panier
          if (updatedCart.length === productIds.length || 
              productIds.length === 0 || 
              updatedCart.length + (hasChanges ? 1 : 0) === productIds.length) {
            this.cartItemsSubject.next(updatedCart);
            this.saveCartToStorage(updatedCart);
          }
        },
        error: (error) => {
          console.error(`Erreur lors de la récupération du produit ${item.product.id}:`, error);
          // Conserver l'élément tel quel dans le panier
          updatedCart.push(item);
          
          if (updatedCart.length === productIds.length) {
            this.cartItemsSubject.next(updatedCart);
            this.saveCartToStorage(updatedCart);
          }
        }
      });
    });
  }
  
  // Obtenir tous les articles du panier
  getCartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }
  
  // Ajouter un produit au panier
  addToCart(product: Product, quantity: number = 1): Observable<boolean> {
    // Vérifier d'abord le stock actuel
    return this.productService.getProductById(product.id).pipe(
      switchMap(currentProduct => {
        // Vérifier si le produit est disponible
        if (!currentProduct.is_available) {
          return throwError(() => new Error('Le produit n\'est plus disponible'));
        }
        
        const currentCart = this.cartItemsSubject.value;
        const existingItemIndex = currentCart.findIndex(item => item.product.id === product.id);
        let newQuantity = quantity;
        
        if (existingItemIndex !== -1) {
          // Le produit existe déjà, calculer la nouvelle quantité totale
          newQuantity += currentCart[existingItemIndex].quantity;
        }
        
        // Vérifier si le stock est suffisant
        if (newQuantity > currentProduct.stock) {
          return throwError(() => new Error(`Stock insuffisant. Disponible: ${currentProduct.stock}`));
        }
        
        // Mettre à jour le panier
        const updatedCart = [...currentCart];
        
        if (existingItemIndex !== -1) {
          updatedCart[existingItemIndex].quantity = newQuantity;
          updatedCart[existingItemIndex].product = currentProduct; // Mettre à jour avec les infos produit récentes
        } else {
          updatedCart.push({ product: currentProduct, quantity: newQuantity });
        }
        
        this.cartItemsSubject.next(updatedCart);
        this.saveCartToStorage(updatedCart);
        
        return of(true);
      }),
      catchError(error => {
        console.error('Erreur lors de l\'ajout au panier:', error);
        return throwError(() => error);
      })
    );
  }
  
  // Mettre à jour la quantité d'un produit
  updateQuantity(productId: number, change: number): Observable<boolean> {
    const currentCart = this.cartItemsSubject.value;
    const existingItemIndex = currentCart.findIndex(item => item.product.id === productId);
    
    if (existingItemIndex === -1) {
      return throwError(() => new Error('Produit non trouvé dans le panier'));
    }
    
    const newQuantity = currentCart[existingItemIndex].quantity + change;
    
    if (newQuantity <= 0) {
      // Supprimer l'article si la quantité est 0 ou négative
      return this.removeFromCart(productId);
    }
    
    // Vérifier le stock avant de mettre à jour
    return this.productService.getProductById(productId).pipe(
      switchMap(product => {
        if (!product.is_available) {
          this.removeFromCart(productId);
          return throwError(() => new Error('Le produit n\'est plus disponible'));
        }
        
        if (newQuantity > product.stock) {
          return throwError(() => new Error(`Stock insuffisant. Disponible: ${product.stock}`));
        }
        
        const updatedCart = [...currentCart];
        updatedCart[existingItemIndex].quantity = newQuantity;
        updatedCart[existingItemIndex].product = product; // Mettre à jour avec les infos produit récentes
        
        this.cartItemsSubject.next(updatedCart);
        this.saveCartToStorage(updatedCart);
        
        return of(true);
      }),
      catchError(error => {
        console.error('Erreur lors de la mise à jour de la quantité:', error);
        return throwError(() => error);
      })
    );
  }
  
  // Définir la quantité exacte d'un produit
  setQuantity(productId: number, quantity: number): Observable<boolean> {
    if (quantity <= 0) {
      return this.removeFromCart(productId);
    }
    
    const currentCart = this.cartItemsSubject.value;
    const existingItemIndex = currentCart.findIndex(item => item.product.id === productId);
    
    if (existingItemIndex === -1) {
      return throwError(() => new Error('Produit non trouvé dans le panier'));
    }
    
    // Vérifier le stock avant de mettre à jour
    return this.productService.getProductById(productId).pipe(
      switchMap(product => {
        if (!product.is_available) {
          this.removeFromCart(productId);
          return throwError(() => new Error('Le produit n\'est plus disponible'));
        }
        
        if (quantity > product.stock) {
          return throwError(() => new Error(`Stock insuffisant. Disponible: ${product.stock}`));
        }
        
        const updatedCart = [...currentCart];
        updatedCart[existingItemIndex].quantity = quantity;
        updatedCart[existingItemIndex].product = product; // Mettre à jour avec les infos produit récentes
        
        this.cartItemsSubject.next(updatedCart);
        this.saveCartToStorage(updatedCart);
        
        return of(true);
      }),
      catchError(error => {
        console.error('Erreur lors de la définition de la quantité:', error);
        return throwError(() => error);
      })
    );
  }
  
  // Supprimer un produit du panier
  removeFromCart(productId: number): Observable<boolean> {
    const currentCart = this.cartItemsSubject.value;
    const updatedCart = currentCart.filter(item => item.product.id !== productId);
    
    this.cartItemsSubject.next(updatedCart);
    this.saveCartToStorage(updatedCart);
    
    return of(true);
  }
  
  // Vider tout le panier
  clearCart(): void {
    this.cartItemsSubject.next([]);
    this.saveCartToStorage([]);
  }
  
  // Obtenir le sous-total du panier (sans taxes ni frais de livraison)
  getSubTotal(): number {
    return this.cartItemsSubject.value.reduce((total, item) => {
      const price = item.product.final_price || item.product.price;
      return total + (price * item.quantity);
    }, 0);
  }
  
  // Calculer la TVA (20%)
  getTax(): number {
    // Calculer la TVA directement sur le sous-total (même calcul que pour les commandes)
    const subtotal = this.getSubTotal();
    return Math.round(subtotal * 0.2 * 100) / 100; // Arrondir à 2 décimales
  }
  
  // Obtenir les frais de livraison (gratuit au-dessus de 50€, sinon 5€)
  getShipping(): number {
    return this.getSubTotal() >= 50 ? 0 : 5;
  }
  
  // Obtenir le total du panier
  getTotal(): number {
    return this.getSubTotal() + this.getTax() + this.getShipping();
  }
  
  // Obtenir le nombre total d'articles
  getCartItemCount(): number {
    return this.cartItemsSubject.value.reduce((count, item) => count + item.quantity, 0);
  }
  
  // Passer à la page de paiement
  proceedToCheckout(): void {
    // Vérifier si l'utilisateur est connecté
    if (!this.authClientService.isClientAuthenticated()) {
      this.router.navigate(['/login-client'], { 
        queryParams: { returnUrl: '/checkout' } 
      });
      return;
    }
    
    // Vérifier si le panier est vide
    if (this.getCartItemCount() === 0) {
      console.error('Impossible de procéder au paiement: panier vide');
      return;
    }
    
    // Rediriger vers la page de paiement
    this.router.navigate(['/checkout']);
  }
  
  // Passer une commande (pour l'intégration avec l'OrderService)
  checkout(shippingAddress: any): Observable<any> {
    // Vérifier si l'utilisateur est connecté
    if (!this.authClientService.isClientAuthenticated()) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }
    
    // Créer l'objet de commande
    const orderData: CreateOrderRequest = {
      items: this.cartItemsSubject.value.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      })),
      shipping_address: shippingAddress
    };
    
    // Utiliser le service de commande pour créer la commande
    return this.orderService.createOrder(orderData).pipe(
      tap(() => {
        // Vider le panier après une commande réussie
        this.clearCart();
      })
    );
  }
} 