# Generated by Django 5.0.1 on 2025-04-04 11:59

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0005_fix_database_schema'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='product',
            name='discount_percent',
        ),
        migrations.AddField(
            model_name='product',
            name='discount_percentage',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=5),
        ),
        migrations.AddField(
            model_name='product',
            name='is_on_promotion',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='product',
            name='category',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='description',
            field=models.TextField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name='product',
            name='name',
            field=models.CharField(max_length=200),
        ),
        migrations.AlterField(
            model_name='product',
            name='stock',
            field=models.IntegerField(default=0),
        ),
        migrations.CreateModel(
            name='Cart',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_id', models.IntegerField()),
                ('quantity', models.IntegerField(default=1)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='products.product')),
            ],
        ),
    ]
