from django.core.management.base import BaseCommand
from promotions.models import Promotion
from django.utils import timezone
import datetime

class Command(BaseCommand):
    help = 'Creates a test promotion with code PROMO202504SEJ7'

    def handle(self, *args, **kwargs):
        # Vérifie si le code existe déjà
        if Promotion.objects.filter(code='PROMO202504SEJ7').exists():
            self.stdout.write(self.style.SUCCESS('Le code PROMO202504SEJ7 existe déjà'))
            return
            
        # Création d'une promotion valide
        today = timezone.now().date()
        
        Promotion.objects.create(
            code='PROMO202504SEJ7',
            description='aid fater',
            details='jfnfjjf',
            type='percentage',
            value=10.00,
            start_date=today,
            end_date=today + datetime.timedelta(days=30),
            usage_limit=20,
            status='active'
        )
        
        self.stdout.write(self.style.SUCCESS('Code promotion PROMO202504SEJ7 créé avec succès')) 