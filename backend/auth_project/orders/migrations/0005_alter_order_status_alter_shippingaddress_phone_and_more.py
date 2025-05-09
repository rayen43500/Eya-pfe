# Generated by Django 5.0.1 on 2025-04-06 09:45

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_shippingaddress_full_name_shippingaddress_phone'),
    ]

    operations = [
        migrations.AlterField(
            model_name='order',
            name='status',
            field=models.CharField(choices=[('pending', 'En attente'), ('pending_payment', 'En attente de paiement'), ('processing', 'En traitement'), ('shipped', 'Expédiée'), ('delivered', 'Livrée'), ('cancelled', 'Annulée')], default='pending', max_length=20),
        ),
        migrations.AlterField(
            model_name='shippingaddress',
            name='phone',
            field=models.CharField(blank=True, max_length=8, null=True),
        ),
        migrations.AlterField(
            model_name='shippingaddress',
            name='postal_code',
            field=models.CharField(max_length=4),
        ),
    ]
