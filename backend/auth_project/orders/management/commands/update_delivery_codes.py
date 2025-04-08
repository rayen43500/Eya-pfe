from django.core.management.base import BaseCommand
from orders.models import Order

class Command(BaseCommand):
    help = 'Met à jour les codes de livraison pour les commandes expédiées'

    def handle(self, *args, **kwargs):
        # Récupérer toutes les commandes expédiées sans code de livraison
        orders = Order.objects.filter(
            status='shipped',
            delivery_code__isnull=True
        )
        
        self.stdout.write(f"Trouvé {orders.count()} commande(s) à mettre à jour")
        
        updated_count = 0
        for order in orders:
            try:
                # Générer un nouveau code de livraison
                order.delivery_code = order.generate_unique_code()
                order.save()
                
                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Code de livraison mis à jour pour la commande #{order.id}: {order.delivery_code}'
                    )
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(
                        f'Erreur lors de la mise à jour du code pour la commande #{order.id}: {str(e)}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'{updated_count} code(s) de livraison mis à jour avec succès!'
            )
        ) 