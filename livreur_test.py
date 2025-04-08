"""
Script pour créer un compte livreur de test.
Exécuter avec: python manage.py shell < livreur_test.py
"""

from django.contrib.auth import get_user_model
from accounts.models import LivreurProfile
import random

User = get_user_model()

# Données pour le livreur test
username = 'livreur_test'
email = 'livreur@example.com'
password = 'livreur123'

# Vérifier si l'utilisateur existe déjà
if User.objects.filter(username=username).exists():
    print(f"Le livreur '{username}' existe déjà ✅")
    user = User.objects.get(username=username)
else:
    # Créer l'utilisateur livreur
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password,
        role='livreur'
    )
    print(f"Utilisateur livreur '{username}' créé avec succès ✅")

# Vérifier si le profil livreur existe
try:
    profile = LivreurProfile.objects.get(user=user)
    print(f"Le profil du livreur '{username}' existe déjà ✅")
except LivreurProfile.DoesNotExist:
    # Créer le profil livreur
    profile = LivreurProfile.objects.create(
        user=user,
        phone_number=f"06{random.randint(10000000, 99999999)}",
        vehicle_type='moto',
        is_available=True,
        is_approved=True
    )
    print(f"Profil livreur pour '{username}' créé avec succès ✅")

print(f"\nVous pouvez maintenant vous connecter avec:")
print(f"Nom d'utilisateur: {username}")
print(f"Mot de passe: {password}")
print(f"\nRôle: {user.role}")
print(f"Type de véhicule: {profile.get_vehicle_type_display()}")
print(f"Statut d'approbation: {'Approuvé' if profile.is_approved else 'En attente'}") 