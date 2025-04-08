from django.db import models
from django.utils import timezone
from orders.models import Order

class Delivery(models.Model):
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('shipped', 'Expédiée'),
        ('delivered', 'Livrée'),
        ('cancelled', 'Annulée'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='delivery')
    driver_name = models.CharField(max_length=100, blank=True, null=True)
    delivery_date = models.DateTimeField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Livraison'
        verbose_name_plural = 'Livraisons'
        ordering = ['-created_at']

    def __str__(self):
        return f"Livraison #{self.order.id}"

    @property
    def order_number(self):
        return str(self.order.id)

    @property
    def customer_name(self):
        if self.order.client:
            return f"{self.order.client.first_name} {self.order.client.last_name}"
        return "Client inconnu"

    @property
    def products_count(self):
        return self.order.items.count()

    @property
    def total_amount(self):
        return float(self.order.total_amount)

    @property
    def status_display(self):
        return dict(self.STATUS_CHOICES).get(self.status, self.status)
