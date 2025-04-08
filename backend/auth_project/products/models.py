from django.db import models

# Create your models here.
from django.db import models

class Product(models.Model):
    CATEGORY_CHOICES = [
        ('electronics', 'Électronique'),
        ('fashion', 'Mode'),
        ('home', 'Maison'),
        ('beauty', 'Beauté'),
    ]
    
    STATUS_CHOICES = [
        ('available', 'Disponible'),
        ('low_stock', 'Stock bas'),
        ('out_of_stock', 'Rupture de stock'),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    image = models.ImageField(upload_to='products/', blank=True, null=True)
    stock = models.IntegerField(default=0)
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=4.0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    is_on_promotion = models.BooleanField(default=False)
    
    @property
    def final_price(self):
        if self.is_on_promotion and self.discount_percentage > 0:
            discount_amount = (self.price * self.discount_percentage) / 100
            return round(self.price - discount_amount, 2)
        return self.price
    
    @property
    def has_discount(self):
        return self.is_on_promotion and self.discount_percentage > 0
    
    @property
    def is_available(self):
        """Vérifie si le produit est disponible (stock > 0 et statut 'available')"""
        return self.stock > 0 and self.status == 'available'
    
    def __str__(self):
        return self.name

    def get_category_display(self):
        return dict(self.CATEGORY_CHOICES).get(self.category, 'Inconnu')

class Cart(models.Model):
    user_id = models.IntegerField()
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user_id} - {self.product.name} ({self.quantity})"
