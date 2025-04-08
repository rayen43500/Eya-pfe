from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from .models import Promotion, UserPromotion
from notifications.utils import send_push_notification

@receiver(post_save, sender=Promotion)
def notify_new_promotion(sender, instance, created, **kwargs):
    """Notifie les utilisateurs lors de la création d'une nouvelle promotion"""
    if created and instance.status == 'active':
        # Logique d'envoi d'emails ou notifications push
        # Exemple avec emails
        from django.contrib.auth.models import User
        
        subject = f"Nouvelle promotion: {instance.description}"
        message = f"""
        Bonjour,
        
        Nous sommes ravis de vous annoncer notre nouvelle promotion:
        
        {instance.description}
        {instance.details}
        
        Utilisez le code: {instance.code}
        
        Valable du {instance.start_date.strftime('%d/%m/%Y')} au {instance.end_date.strftime('%d/%m/%Y')}.
        
        À bientôt!
        """
        
        # Envoyer aux utilisateurs abonnés aux notifications
        for user in User.objects.filter(profile__subscribe_to_promotions=True):
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )

@receiver(post_save, sender=Promotion)
def notify_promotion_push(sender, instance, created, **kwargs):
    if created and instance.status == 'active':
        # Récupérer les tokens des appareils des utilisateurs
        from profiles.models import Profile
        
        tokens = []
        for profile in Profile.objects.filter(subscribe_to_promotions=True).exclude(device_token=''):
            if profile.device_token:
                tokens.append(profile.device_token)
        
        if tokens:
            title = f"Nouvelle promotion: {instance.code}"
            body = f"{instance.description}"
            data = {
                'promotion_id': str(instance.id),
                'code': instance.code,
                'discount': instance.value_display,
                'expiry': instance.end_date.strftime('%d/%m/%Y')
            }
            
            send_push_notification(tokens, title, body, data) 