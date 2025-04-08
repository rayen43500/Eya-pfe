from django.shortcuts import get_object_or_404
from rest_framework import status, permissions, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes, action
from .models import Order, Product, OrderItem, ShippingAddress
from .serializers import OrderSerializer
from django.contrib.auth import get_user_model
import json
from django.db import models

User = get_user_model()

class OrderListView(APIView):
    def get(self, request, *args, **kwargs):
        """Get all orders for the requesting user based on their role"""
        user = request.user
        
        # Paramètres de filtre optionnels
        status_filter = request.query_params.get('status')
        client_search = request.query_params.get('client')
        
        if user.is_admin_user():
            # Admins can see all orders
            orders = Order.objects.all()
            if client_search:
                orders = orders.filter(client__username__icontains=client_search)
        elif user.is_livreur():
            # Livreurs see:
            # 1. Orders assigned to them
            # 2. Available orders for delivery (status = shipped, no livreur assigned)
            orders = Order.objects.filter(
                models.Q(livreur=user) |  # Commandes assignées
                models.Q(status='shipped', livreur__isnull=True)  # Commandes disponibles
            )
        elif user.is_client():
            # Clients see only their own orders
            orders = Order.objects.filter(client=user)
        else:
            return Response({"error": "Unauthorized access"}, status=status.HTTP_403_FORBIDDEN)
        
        # Appliquer le filtre de statut si fourni
        if status_filter:
            orders = orders.filter(status=status_filter)
            
        # Toujours trier par date la plus récente
        orders = orders.order_by('-created_at')
            
        serializer = OrderSerializer(orders, many=True, context={'request': request})
        return Response(serializer.data)

class OrderDetailView(APIView):
    def get(self, request, order_id, *args, **kwargs):
        user = request.user
        order = get_object_or_404(Order, id=order_id)
        
        # Verify user has permission to view this order
        if not (user.is_admin_user() or order.client == user or order.livreur == user):
            return Response({"error": "Unauthorized access"}, status=status.HTTP_403_FORBIDDEN)
            
        serializer = OrderSerializer(order, context={'request': request})
        return Response(serializer.data)

class AssignOrderToLivreurView(APIView):
    def post(self, request, order_id, *args, **kwargs):
        user = request.user
        
        # Only livreur can pick up orders
        if not user.is_livreur():
            return Response({"error": "Only delivery personnel can be assigned to orders"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        order = get_object_or_404(Order, id=order_id)
        
        # Check if order is available for pickup
        if order.status != 'shipped' or order.livreur is not None:
            return Response({"error": "This order is not available for pickup"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Assign the livreur
        order.livreur = user
        order.save()
        
        serializer = OrderSerializer(order, context={'request': request})
        return Response(serializer.data)

class ValidateDeliveryView(APIView):
    def post(self, request, order_id, *args, **kwargs):
        user = request.user
        
        # Verify user is a livreur
        if not user.is_livreur():
            return Response({"error": "Only delivery personnel can validate deliveries"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        order = get_object_or_404(Order, id=order_id)
        
        # Check if the livreur is assigned to this order
        if order.livreur != user:
            return Response({"error": "You are not assigned to this order"}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Get validation code from request
        delivery_code = request.data.get('delivery_code')
        if not delivery_code:
            return Response({"error": "Delivery code is required"}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Validate delivery - accept both the order's code and "0000"
        if delivery_code == "0000" or order.validate_delivery(delivery_code):
            # Update livreur stats if needed
            try:
                livreur_profile = user.livreur_profile
                livreur_profile.total_deliveries += 1
                livreur_profile.save()
            except:
                pass
            
            # Create validation message
            validation_message = f"Commande #{order.id} validée avec succès par {user.username}"
            
            return Response({
                "success": True,
                "message": validation_message,
                "order": OrderSerializer(order, context={'request': request}).data
            })
        else:
            return Response({
                "success": False,
                "message": "Code de livraison invalide"
            }, status=status.HTTP_400_BAD_REQUEST)

class PendingDeliveriesView(APIView):
    def get(self, request, *args, **kwargs):
        user = request.user
        
        # Only livreurs should access this
        if not user.is_livreur():
            return Response({"error": "Unauthorized access"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all shipped orders assigned to this livreur
        pending_deliveries = Order.objects.filter(
            livreur=user,
            status='shipped'
        ).order_by('-created_at')
        
        serializer = OrderSerializer(pending_deliveries, many=True, context={'request': request})
        return Response(serializer.data)

class AvailableDeliveriesView(APIView):
    def get(self, request, *args, **kwargs):
        user = request.user
        
        # Only livreurs should access this
        if not user.is_livreur():
            return Response({"error": "Unauthorized access"}, status=status.HTTP_403_FORBIDDEN)
        
        # Get all shipped orders not yet assigned to any livreur
        available_deliveries = Order.objects.filter(
            status='shipped',
            livreur__isnull=True
        ).order_by('-created_at')
        
        serializer = OrderSerializer(available_deliveries, many=True, context={'request': request})
        return Response(serializer.data)

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    
    def get_serializer_context(self):
        """Ajouter la requête au contexte du sérialiseur"""
        context = super().get_serializer_context()
        context.update({'request': self.request})
        return context
    
    def create(self, request, *args, **kwargs):
        """Créer une nouvelle commande avec les informations du client"""
        # Récupérer le client actuel
        client = request.user
        
        # Journalisation détaillée des données reçues
        print("\n===== CRÉATION DE COMMANDE =====")
        print(f"Client authentifié: {client.username} (ID: {client.id})")
        print(f"Données reçues: {json.dumps(request.data, indent=2)}")
        print("================================\n")
        
        # Vérifier les données de la commande
        if 'items' not in request.data or not request.data['items']:
            print("ERREUR: Aucun article dans la commande")
            return Response({"error": "Items are required"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Calculer le montant total
        total_amount = 0
        items_data = request.data.get('items', [])
        
        # Vérifier que les produits existent avant de créer la commande
        product_ids = [item.get('product_id') for item in items_data]
        existing_products = Product.objects.filter(id__in=product_ids)
        existing_ids = set(product.id for product in existing_products)
        
        missing_ids = [id for id in product_ids if id not in existing_ids]
        if missing_ids:
            print(f"ERREUR: Produits introuvables: {missing_ids}")
            return Response(
                {"error": f"Les produits suivants n'existent pas: {', '.join(map(str, missing_ids))}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Calculer le montant total avec les produits existants
        for item_data in items_data:
            product_id = item_data.get('product_id')
            quantity = item_data.get('quantity', 1)
            
            try:
                product = existing_products.get(id=product_id)
                
                # Vérifier la disponibilité et le stock
                try:
                    # Vérifier d'abord si le produit a l'attribut is_available
                    is_available = getattr(product, 'is_available', True)  # Par défaut True si l'attribut n'existe pas
                    
                    if not is_available or product.stock < quantity:
                        print(f"ERREUR: Produit {product.name} (ID: {product_id}) non disponible ou quantité insuffisante")
                        return Response(
                            {"error": f"Le produit '{product.name}' n'est pas disponible en quantité suffisante (demandé: {quantity}, disponible: {product.stock})"}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except AttributeError:
                    # Si l'attribut is_available n'existe pas, vérifier seulement le stock
                    if product.stock < quantity:
                        print(f"ERREUR: Produit {product.name} (ID: {product_id}) quantité insuffisante")
                        return Response(
                            {"error": f"Le produit '{product.name}' n'est pas disponible en quantité suffisante (demandé: {quantity}, disponible: {product.stock})"}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                
                # Utiliser le prix final avec remise si disponible
                try:
                    # Utiliser la propriété final_price au lieu de la méthode get_final_price
                    price = product.final_price
                except AttributeError:
                    # Utiliser le prix de base si la propriété n'existe pas
                    price = product.price
                    
                total_amount += price * quantity
            except Exception as e:
                print(f"ERREUR lors du calcul du prix pour le produit {product_id}: {str(e)}")
                return Response(
                    {"error": f"Erreur lors du calcul du prix pour le produit {product_id}: {str(e)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Créer la commande avec les informations validées
        try:
            # Déterminer le statut initial en fonction de la méthode de paiement
            initial_status = 'pending'
            payment_method = request.data.get('payment_method', 'card')
            
            # Pour les paiements en espèces, utiliser pending_payment comme statut
            if payment_method == 'cash':
                initial_status = 'pending_payment'
            
            # Préparer les données de la commande
            order_data = {
                'client': client.id,
                'total_amount': total_amount,
                'status': initial_status,
                'payment_method': payment_method
            }
            
            print(f"Création de commande avec statut: {initial_status}, méthode de paiement: {payment_method}")
            
            serializer = self.get_serializer(data=order_data)
            serializer.is_valid(raise_exception=True)
            order = serializer.save()
            
            print(f"Commande créée avec succès (ID: {order.id})")
            
            # Ajouter les items à la commande
            for item_data in items_data:
                product_id = item_data.get('product_id')
                quantity = item_data.get('quantity', 1)
                
                try:
                    product = existing_products.get(id=product_id)
                    price = product.final_price
                    
                    OrderItem.objects.create(
                        order=order,
                        product=product,
                        product_name=product.name,
                        quantity=quantity,
                        price=price
                    )
                    
                    # Mettre à jour le stock du produit
                    if product.stock >= quantity:
                        product.stock -= quantity
                        product.save()
                    
                    print(f"Article ajouté: {quantity}x {product.name}")
                except Exception as e:
                    # Si une erreur se produit, annuler la commande
                    print(f"ERREUR lors de l'ajout d'un article: {str(e)}")
                    order.delete()
                    return Response(
                        {"error": f"Error adding items to order: {str(e)}"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
        except Exception as e:
            print(f"ERREUR lors de la création de la commande: {str(e)}")
            return Response(
                {"error": f"Error creating order: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Ajouter l'adresse de livraison si fournie
        shipping_address_data = request.data.get('shipping_address')
        if shipping_address_data:
            try:
                # Valider les données de l'adresse de livraison
                required_fields = ['address', 'city', 'postal_code', 'country']
                missing_fields = [field for field in required_fields if not shipping_address_data.get(field)]
                
                if missing_fields:
                    print(f"ERREUR: Champs manquants dans l'adresse: {', '.join(missing_fields)}")
                    return Response(
                        {"error": f"Missing required fields in shipping address: {', '.join(missing_fields)}"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Créer l'adresse de livraison
                ShippingAddress.objects.create(
                    order=order,
                    full_name=shipping_address_data.get('full_name', ''),
                    address=shipping_address_data.get('address'),
                    city=shipping_address_data.get('city'),
                    postal_code=shipping_address_data.get('postal_code'),
                    country=shipping_address_data.get('country'),
                    phone=shipping_address_data.get('phone', '')
                )
                print(f"Adresse de livraison ajoutée: {shipping_address_data.get('address')}, {shipping_address_data.get('city')}")
            except Exception as e:
                # Si une erreur se produit, annuler la commande
                print(f"ERREUR lors de la création de l'adresse: {str(e)}")
                order.delete()
                return Response(
                    {"error": f"Error adding shipping address to order: {str(e)}"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Appliquer une promotion si un code promo est fourni
        promo_code = request.data.get('promotion_code')
        if promo_code:
            success, message = order.apply_promotion(promo_code)
            if not success:
                # Ne pas annuler la commande, juste informer l'utilisateur
                serializer = self.get_serializer(order)
                return Response({
                    **serializer.data,
                    "promo_error": message
                })
        
        # Retourner la commande créée
        serializer = self.get_serializer(order)
        print(f"SUCCÈS: Commande {order.id} créée et retournée")
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        order = self.get_object()
        status_value = request.data.get('status')
        
        if not status_value:
            return Response({"error": "Status field is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        if status_value not in [s[0] for s in Order.STATUS_CHOICES]:
            return Response({"error": "Invalid status value"}, status=status.HTTP_400_BAD_REQUEST)
        
        order.status = status_value
        order.save()
        
        serializer = self.get_serializer(order)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def apply_promo(self, request, pk=None):
        """Appliquer un code promo à une commande"""
        order = self.get_object()
        promo_code = request.data.get('promo_code')
        
        if not promo_code:
            return Response({"error": "Promo code is required"}, status=status.HTTP_400_BAD_REQUEST)
        
        # Utiliser la méthode du modèle Order pour appliquer le code promo
        success, message = order.apply_promotion(promo_code)
        
        if not success:
            return Response({"error": message}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(order)
        return Response(serializer.data) 