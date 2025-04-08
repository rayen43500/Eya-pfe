from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from accounts.models import User

def create_test_admin():
    """Créer un utilisateur admin de test si nécessaire"""
    
    # Vérifier si un admin existe déjà
    User = get_user_model()
    admin_username = 'admin_test'
    admin_password = 'admin1234'
    admin_email = 'admin@example.com'
    
    try:
        # Tenter de récupérer l'admin existant
        admin = User.objects.get(username=admin_username)
        print(f"Admin trouvé: {admin.username} ({admin.email})")
    except User.DoesNotExist:
        # Créer un nouvel admin
        admin = User.objects.create_user(
            username=admin_username,
            email=admin_email,
            password=admin_password,
            role='admin'
        )
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        print(f"Nouvel admin créé: {admin.username} ({admin.email})")
    
    # Créer ou récupérer le token d'admin
    token, created = Token.objects.get_or_create(user=admin)
    
    print("\n=== INFORMATIONS D'AUTHENTIFICATION ADMIN ===")
    print(f"Username: {admin_username}")
    print(f"Password: {admin_password}")
    print(f"Token: {token.key}")
    print("=========================================")
    
    # Vérifier les permissions
    print("\n=== VÉRIFICATION DES PERMISSIONS ===")
    print(f"is_staff: {admin.is_staff}")
    print(f"is_superuser: {admin.is_superuser}")
    print(f"is_admin_user(): {admin.is_admin_user() if hasattr(admin, 'is_admin_user') else 'N/A'}")
    
    return admin, token.key

if __name__ == "__main__":
    # Ceci permet d'exécuter le script directement avec python manage.py shell < accounts/test_auth.py
    create_test_admin() 