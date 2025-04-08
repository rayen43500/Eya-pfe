from django.db import models
from django.conf import settings
from products.models import Product
from promotions.models import Promotion
from django.utils.crypto import get_random_string
from django.utils import timezone
import random
import string
import uuid

def generate_validation_code():
    """Generate a random 6-character alphanumeric code for order validation"""
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('pending_payment', 'En attente de paiement'),
        ('processing', 'En traitement'),
        ('shipped', 'Expédiée'),
        ('delivered', 'Livrée'),
        ('cancelled', 'Annulée'),
    ]
    
    PAYMENT_CHOICES = [
        ('card', 'Carte bancaire'),
        ('paypal', 'PayPal'),
        ('cash', 'Espèces'),
    ]

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default='card')
    promotion = models.ForeignKey(
        Promotion, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='orders'
    )
    discount_amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0
    )
    delivery_code = models.CharField(max_length=6, unique=True, blank=True, null=True)
    is_code_validated = models.BooleanField(default=False)
    livreur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deliveries'
    )

    def __str__(self):
        return f"Commande #{self.id} - {self.client.username}"

    def save(self, *args, **kwargs):
        print(f"\n===== SAUVEGARDE DE LA COMMANDE #{self.id} =====")
        print(f"Statut actuel: {self.status}")
        print(f"Code de livraison actuel: {self.delivery_code}")
        
        # Generate delivery code if it doesn't exist
        if not self.delivery_code:
            try:
                # Générer le code immédiatement
                self.delivery_code = self.generate_unique_code()
                print(f"✅ Nouveau code de livraison généré: {self.delivery_code}")
            except Exception as e:
                print(f"❌ Erreur lors de la génération du code: {str(e)}")
                # En cas d'erreur, générer un code simple
                self.delivery_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                print(f"⚠️ Code de secours généré: {self.delivery_code}")
        
        # Sauvegarder la commande
        super().save(*args, **kwargs)
        print(f"✅ Commande sauvegardée avec succès")
        print(f"Code de livraison final: {self.delivery_code}")
        print("================================\n")
        
    def generate_unique_code(self):
        """Génère un code unique pour la commande"""
        max_attempts = 100
        attempt = 0
        
        while attempt < max_attempts:
            # Générer un code aléatoire de 6 caractères
            code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            
            # Vérifier si le code existe déjà
            if not Order.objects.filter(delivery_code=code).exists():
                return code
                
            attempt += 1
            
        # Si on n'a pas trouvé de code unique après max_attempts essais,
        # générer un code basé sur l'UUID
        return str(uuid.uuid4())[:6].upper()
        
    def validate_delivery(self, code):
        """Validate the delivery with the provided code"""
        if self.delivery_code == code and self.status == 'shipped':
            self.status = 'delivered'
            self.is_code_validated = True
            self.save()
            return True
        return False
        
    def regenerate_delivery_code(self):
        """Regenerate a new delivery code"""
        self.delivery_code = self.generate_unique_code()
        self.save()
        return self.delivery_code

    def apply_promotion(self, promotion_code):
        from promotions.models import Promotion
        
        try:
            promotion = Promotion.objects.get(code=promotion_code)
            
            # Vérifier si la promotion est valide
            if not promotion.is_valid():
                return False, "Cette promotion n'est plus valide"
                
            # Calculer la remise
            if promotion.type == 'percentage':
                self.discount_amount = (self.total_amount * promotion.value) / 100
            elif promotion.type == 'fixed':
                self.discount_amount = min(promotion.value, self.total_amount)
            elif promotion.type == 'free_shipping':
                self.shipping_cost = 0
                
            # Mettre à jour le total
            self.final_amount = self.total_amount - self.discount_amount
            
            # Associer la promotion
            self.promotion = promotion
            
            # Incrémenter l'utilisation
            promotion.usage_count += 1
            promotion.save()
            
            self.save()
            return True, "Promotion appliquée avec succès"
            
        except Promotion.DoesNotExist:
            return False, "Code promotion invalide"

    def get_total_items(self):
        return self.items.count()
    
    def get_status_display_value(self):
        """Retourne la valeur d'affichage du statut"""
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
    
    def get_payment_method_display(self):
        """Retourne la valeur d'affichage du mode de paiement"""
        return dict(self.PAYMENT_CHOICES).get(self.payment_method, self.payment_method)
    
    @property
    def client_name(self):
        """Propriété pour récupérer facilement le nom du client"""
        if self.client:
            return self.client.username
        return "Client inconnu"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, related_name='order_items')
    product_name = models.CharField(max_length=100)  # Pour conserver le nom même si le produit est supprimé
    quantity = models.PositiveIntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Prix unitaire au moment de l'achat
    
    def __str__(self):
        return f"{self.quantity} x {self.product_name}"
    
    @property
    def subtotal(self):
        return self.quantity * self.price

class ShippingAddress(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='shipping_address')
    full_name = models.CharField(max_length=255, blank=True, null=True)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=4)  # Limité à 4 chiffres
    country = models.CharField(max_length=100)
    phone = models.CharField(max_length=8, blank=True, null=True)  # Limité à 8 chiffres
    
    def __str__(self):
        return f"Adresse pour commande #{self.order.id}" 