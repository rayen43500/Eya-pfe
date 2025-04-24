import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { OrderService, Order, CreateOrderRequest } from '../../services/order.service';
import { CartService } from '../../services/cart.service';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthClientService } from '../../services/auth-client.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class CheckoutComponent implements OnInit {
  checkoutForm!: FormGroup;
  paymentForm!: FormGroup;
  order: Order | null = null;
  orderId: number = 0;
  step: 'shipping' | 'payment' | 'confirmation' = 'shipping';
  isLoading: boolean = false;
  error: string = '';
  promoCode: string = '';
  promoError: string = '';
  promoSuccess: string = '';
  paymentMethods: string[] = ['card', 'paypal', 'cash'];
  selectedPaymentMethod: string = 'card';
  cartItems: any[] = [];
  
  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private orderService: OrderService,
    public cartService: CartService,
    private authClientService: AuthClientService
  ) {}
  
  ngOnInit(): void {
    // Vérifier si l'utilisateur est connecté
    if (!this.authClientService.isClientAuthenticated()) {
      console.log('💡 Utilisateur non authentifié. Redirection vers la page de connexion...');
      this.router.navigate(['/login-client'], { 
        queryParams: { returnUrl: '/checkout' }
      });
      return;
    }
    
    // Vérifier si l'utilisateur a des articles dans son panier
    this.cartItems = this.cartService.getCartItems();
    if (this.cartItems.length === 0) {
      this.router.navigate(['/espaceclient/shoop-bord']);
      return;
    }
    
    this.initShippingForm();
    this.initPaymentForm();
    
    // Récupérer l'ID de commande existante si disponible dans les paramètres d'URL
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.orderId = +params['id'];
        this.loadOrderDetails();
      }
    });
  }
  
  initShippingForm(): void {
    this.checkoutForm = this.formBuilder.group({
      fullName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.pattern('^[0-9]{4}$')]],
      country: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern('^[0-9]{8}$')]]
    });
  }
  
  initPaymentForm(): void {
    this.paymentForm = this.formBuilder.group({
      cardName: ['', Validators.required],
      cardNumber: ['', [Validators.required, Validators.pattern('^[0-9]{16}$')]],
      expMonth: ['', [Validators.required, Validators.min(1), Validators.max(12)]],
      expYear: ['', [Validators.required, Validators.min(new Date().getFullYear())]],
      cvv: ['', [Validators.required, Validators.pattern('^[0-9]{3,4}$')]]
    });
  }
  
  loadOrderDetails(): void {
    if (!this.orderId) return;
    
    this.isLoading = true;
    this.orderService.getOrderDetails(this.orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la commande', error);
        this.error = 'Impossible de charger les détails de la commande';
        this.isLoading = false;
      }
    });
  }
  
  nextStep(): void {
    if (this.step === 'shipping' && this.checkoutForm.valid) {
      this.step = 'payment';
    } else if (this.step === 'payment' && this.paymentForm.valid) {
      this.processPayment();
    }
  }
  
  prevStep(): void {
    if (this.step === 'payment') {
      this.step = 'shipping';
    }
  }
  
  processPayment(): void {
    this.isLoading = true;
    this.error = ''; // Réinitialiser les erreurs précédentes
    
    // Préparer les données de la commande
    const orderData: CreateOrderRequest = {
      items: this.cartItems.map(item => ({
        product_id: item.product?.id || 0,
        quantity: item.quantity || 1
      })),
      shipping_address: {
        full_name: this.checkoutForm.value.fullName || '',
        address: this.checkoutForm.value.address || '',
        city: this.checkoutForm.value.city || '',
        postal_code: this.checkoutForm.value.postalCode || '',
        country: this.checkoutForm.value.country || '',
        phone: this.checkoutForm.value.phone || ''
      },
      payment_method: this.selectedPaymentMethod
    };
    
    console.log('🔄 Envoi des données de commande:', orderData);
    
    // Utiliser le service pour créer la commande
    this.orderService.createOrder(orderData).subscribe({
      next: (createdOrder) => {
        console.log('✅ Commande créée avec succès:', createdOrder);
        this.order = createdOrder;
        this.orderId = createdOrder.id;
        
        // Pour le paiement en espèces
        if (this.selectedPaymentMethod === 'cash' && this.order) {
          this.order.status_display = 'En attente de paiement';
        }
        
        this.isLoading = false;
        this.step = 'confirmation';
        
        // Vider le panier
        this.cartService.clearCart();
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création de la commande:', error);
        this.error = 'Une erreur est survenue lors de la création de votre commande. Veuillez réessayer.';
        this.isLoading = false;
      }
    });
  }
  
  finalizeOrder(status: string): void {
    // Mise à jour du statut de la commande après paiement
    this.orderService.updateOrderStatus(this.orderId, status).subscribe({
      next: (updatedOrder) => {
        this.order = updatedOrder;
        
        // Pour les paiements en espèces, forcer l'affichage du statut approprié
        if (this.selectedPaymentMethod === 'cash' && this.order) {
          this.order.status_display = 'En attente de paiement';
        }
        
        this.isLoading = false;
        this.step = 'confirmation';
        
        // Vider le panier
        this.cartService.clearCart();
        
        // Pas de redirection automatique - l'utilisateur décidera quand quitter la page
      },
      error: (error) => {
        console.error('Erreur lors de la finalisation de la commande', error);
        this.error = 'Le paiement a été accepté mais nous avons rencontré un problème lors de la finalisation de la commande';
        this.isLoading = false;
      }
    });
  }
  
  applyPromoCode(): void {
    if (!this.promoCode) {
      console.error('Code promo non spécifié');
      return;
    }

    this.orderService.applyPromoCode(this.orderId, this.promoCode).subscribe({
      next: (response: Order) => {
        console.log('Code promo appliqué avec succès:', response);
        this.loadOrderDetails();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Erreur lors de l\'application du code promo:', error);
      }
    });
  }
  
  setPaymentMethod(method: string): void {
    this.selectedPaymentMethod = method;
    
    // Configurer les validateurs en fonction de la méthode de paiement
    const cardFields = ['cardName', 'cardNumber', 'expMonth', 'expYear', 'cvv'];
    
    if (method === 'card') {
      // Activer les validateurs pour le paiement par carte
      cardFields.forEach(field => {
        this.paymentForm.get(field)?.setValidators([Validators.required]);
        
        // Ajouter des validateurs spécifiques selon le champ
        if (field === 'cardNumber') {
          this.paymentForm.get(field)?.setValidators([
            Validators.required, 
            Validators.pattern('^[0-9]{16}$')
          ]);
        } else if (field === 'expMonth') {
          this.paymentForm.get(field)?.setValidators([
            Validators.required,
            Validators.min(1),
            Validators.max(12)
          ]);
        } else if (field === 'expYear') {
          this.paymentForm.get(field)?.setValidators([
            Validators.required,
            Validators.min(new Date().getFullYear())
          ]);
        } else if (field === 'cvv') {
          this.paymentForm.get(field)?.setValidators([
            Validators.required,
            Validators.pattern('^[0-9]{3,4}$')
          ]);
        }
        
        this.paymentForm.get(field)?.updateValueAndValidity();
      });
    } else {
      // Désactiver les validateurs pour les autres méthodes de paiement
      cardFields.forEach(field => {
        this.paymentForm.get(field)?.clearValidators();
        this.paymentForm.get(field)?.updateValueAndValidity();
      });
    }
  }
  
  getSubtotal(): number {
    if (this.order) {
      return this.order.total_amount + (this.order.discount_amount || 0);
    }
    return this.cartService.getSubTotal();
  }
  
  getDiscount(): number {
    if (this.order) {
      return this.order.discount_amount || 0;
    }
    return 0;
  }
  
  getTaxAmount(): number {
    if (this.order) {
      // Si la commande est déjà créée, la taxe est incluse dans le montant total
      return 0;
    }
    return this.cartService.getTax();
  }
  
  getShippingCost(): number {
    if (this.order) {
      // Si la commande est déjà créée, les frais de livraison sont inclus
      return 0;
    }
    return this.cartService.getShipping();
  }
  
  getTotal(): number {
    if (this.order) {
      return this.order.total_amount;
    }
    return this.cartService.getTotal();
  }
  
  backToShop(): void {
    this.router.navigate(['/espaceclient/shoop-bord']);
  }
  
  viewOrderDetails(): void {
    this.router.navigate(['/espaceclient/mes-commandes', this.orderId]);
  }
  
  // Méthode publique pour accéder aux éléments du panier
  getCartItems(): any[] {
    return this.cartItems;
  }
} 