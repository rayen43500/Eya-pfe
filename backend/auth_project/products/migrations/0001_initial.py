# Generated by Django 5.0.1 on 2025-03-23 14:57

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('category', models.CharField(choices=[('electronics', 'Électronique'), ('fashion', 'Mode'), ('home', 'Maison'), ('beauty', 'Beauté')], max_length=50)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('stock', models.IntegerField(default=0)),
                ('image', models.ImageField(upload_to='product_images/')),
            ],
        ),
    ]
