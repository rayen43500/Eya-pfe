from django.core.management.base import BaseCommand
from accounts.models import User
import getpass

class Command(BaseCommand):
    help = 'Crée un utilisateur administrateur'

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, help='Nom d\'utilisateur')
        parser.add_argument('--email', type=str, help='Email')
        parser.add_argument('--password', type=str, help='Mot de passe')
        parser.add_argument('--noinput', action='store_true', help='Ne pas demander de confirmation')

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']
        
        if not username:
            username = input("Nom d'utilisateur: ")
        
        if not email:
            email = input("Email: ")
        
        if not password:
            password = getpass.getpass("Mot de passe: ")
            password_confirm = getpass.getpass("Confirmez le mot de passe: ")
            
            if password != password_confirm:
                self.stdout.write(self.style.ERROR('Les mots de passe ne correspondent pas!'))
                return
        
        if User.objects.filter(username=username).exists():
            self.stdout.write(self.style.ERROR(f'L\'utilisateur "{username}" existe déjà!'))
            return
        
        # Créer l'administrateur
        admin = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        admin.role = 'admin'
        admin.is_staff = True
        admin.is_superuser = True
        admin.save()
        
        self.stdout.write(self.style.SUCCESS(f'Administrateur "{username}" créé avec succès!')) 