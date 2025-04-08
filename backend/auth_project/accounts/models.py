from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Admin'),
        ('livreur', 'Livreur'),
        ('client', 'Client'),
    ]
    
    role = models.CharField(max_length=7, choices=ROLE_CHOICES, default='client')

    def __str__(self):
        return self.username
        
    def is_admin_user(self):
        return self.role == 'admin'
        
    def is_livreur(self):
        return self.role == 'livreur'
        
    def is_client(self):
        return self.role == 'client'

class LivreurProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='livreur_profile')
    phone_number = models.CharField(max_length=15)
    vehicle_type = models.CharField(max_length=10, choices=[
        ('velo', 'Vélo'),
        ('moto', 'Moto'),
        ('voiture', 'Voiture')
    ])
    is_available = models.BooleanField(default=True)
    rating = models.FloatField(default=0.0)
    total_deliveries = models.IntegerField(default=0)
    is_approved = models.BooleanField(default=False)
    documents_verified = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Profil livreur de {self.user.username}" 

class ClientProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='client_profile')
    first_name = models.CharField(max_length=100, verbose_name="Prénom")
    last_name = models.CharField(max_length=100, verbose_name="Nom")
    delivery_address = models.TextField(verbose_name="Adresse de livraison")
    phone_number = models.CharField(max_length=15, verbose_name="Téléphone")
    
    def __str__(self):
        return f"Profil client de {self.user.username}" 

class AdminProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='admin_profile')
    department = models.CharField(max_length=100, verbose_name="Département", blank=True, null=True)
    admin_level = models.CharField(max_length=20, choices=[
        ('super', 'Super Admin'),
        ('manager', 'Manager'),
        ('support', 'Support')
    ], default='support', verbose_name="Niveau d'accès")
    is_active_admin = models.BooleanField(default=True, verbose_name="Admin actif")
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_admins')
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Profil admin de {self.user.username}" 