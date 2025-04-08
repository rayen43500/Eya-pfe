from django.core.management.base import BaseCommand
from django.utils import timezone
from orders.models import Order
from deliveries.models import Delivery

class Command(BaseCommand):
    help = 'Crée des livraisons pour les commandes expédiées qui n\'en ont pas'

    def handle(self, *args, **kwargs):
        # Récupérer toutes les commandes expédiées qui n'ont pas de livraison associée
        orders_without_delivery = Order.objects.filter(
            status='shipped',
            delivery__isnull=True
        )
        
        self.stdout.write(f"Trouvé {orders_without_delivery.count()} commande(s) à traiter")
        
        created_count = 0
        for order in orders_without_delivery:
            try:
                # Créer la livraison
                delivery = Delivery.objects.create(
                    order=order,
                    delivery_date=timezone.now(),
                    status='shipped'
                )
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Livraison créée pour la commande #{order.id}'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Erreur lors de la création de la livraison pour la commande #{order.id}: {str(e)}'
                    )
                )
                # Continuer avec la commande suivante
                continue
        
        self.stdout.write(
            self.style.SUCCESS(
                f'{created_count} livraison(s) créée(s) avec succès!'
            )
        ) 