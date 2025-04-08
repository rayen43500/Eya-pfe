import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthClientService } from '../../../services/auth-client.service';
import { CartService } from '../../../services/cart.service';
import { OrderService } from '../../../services/order.service';

// Utiliser les interfaces importées via CartService
@Component({
  selector: 'app-panier',
  standalone: false,
  templateUrl: './panier.component.html',
  styleUrl: './panier.component.css'
})
export class PanierComponent implements OnInit {
  cartItems: any[] = []; // Nous allons typé ça comme any[] pour éviter les conflits
  isLoading = false;
  error = '';
  
  private readonly CLIENT_TOKEN_KEY = 'client_token';
  private readonly apiUrl = 'http://localhost:8000/api';
  
  constructor(
    private router: Router,
    private http: HttpClient,
    private authClientService: AuthClientService,
    private cartService: CartService,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.loadCartItems();
  }

  loadCartItems(): void {
    // S'abonner aux changements du panier
    this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
    });
  }

  // Calculer le sous-total (sans taxes ni frais de livraison)
  getSubTotal(): number {
    return this.cartService.getSubTotal();
  }

  // Calculer la TVA (20%)
  getTax(): number {
    return this.cartService.getTax();
  }

  // Calculer les frais de livraison (gratuit au-dessus de 50€, sinon 5€)
  getShipping(): number {
    return this.cartService.getShipping();
  }

  // Calculer le total final
  getTotal(): number {
    return this.cartService.getTotal();
  }

  // Augmenter la quantité d'un produit
  updateQuantity(productId: number, change: number): void {
    this.cartService.updateQuantity(productId, change);
  }

  // Supprimer un produit du panier
  removeFromCart(productId: number): void {
    this.cartService.removeFromCart(productId);
  }

  // Vider le panier
  clearCart(): void {
    this.cartService.clearCart();
  }

  // Sauvegarder le panier
  updateLocalStorage(): void {
    // Cette méthode n'est plus nécessaire car le CartService gère le localStorage
  }

  // Processus de validation de commande
  checkout(): void {
    if (!this.authClientService.isClientAuthenticated()) {
      // Rediriger vers la page de connexion si l'utilisateur n'est pas connecté
      alert('Veuillez vous connecter pour passer commande');
      this.router.navigate(['/login-client'], { 
        queryParams: { returnUrl: '/espaceclient/panier' } 
      });
      return;
    }
    
    // Vérifier que le panier n'est pas vide
    if (this.cartItems.length === 0) {
      this.error = 'Votre panier est vide.';
      return;
    }
    
    // Rediriger directement vers la page de checkout
    this.router.navigate(['/checkout']);
  }
}
