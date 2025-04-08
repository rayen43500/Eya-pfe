from django.core.management.base import BaseCommand
from accounts.models import User

class Command(BaseCommand):
    help = 'Crée des utilisateurs de test pour chaque rôle'

    def handle(self, *args, **kwargs):
        # Créer un admin
        admin, created = User.objects.get_or_create(
            username='admin_test',
            defaults={
                'email': 'admin@example.com',
                'role': 'admin',
                'is_staff': True
            }
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS('Admin créé avec succès'))
        
        # Créer un livreur
        livreur, created = User.objects.get_or_create(
            username='livreur_test',
            defaults={
                'email': 'livreur@example.com',
                'role': 'livreur'
            }
        )
        if created:
            livreur.set_password('livreur123')
            livreur.save()
            self.stdout.write(self.style.SUCCESS('Livreur créé avec succès'))
        
        # Créer un client
        client, created = User.objects.get_or_create(
            username='client_test',
            defaults={
                'email': 'client@example.com',
                'role': 'client'
            }
        )
        if created:
            client.set_password('client123')
            client.save()
            self.stdout.write(self.style.SUCCESS('Client créé avec succès')) 