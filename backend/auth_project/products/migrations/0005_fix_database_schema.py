# Generated manually

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0004_product_updated_at'),
    ]
    
    # Migration SQL directe pour contourner les problèmes de schéma
    operations = [
        migrations.RunSQL(
            # SQL à exécuter
            """
            ALTER TABLE products_product ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;
            ALTER TABLE products_product ADD COLUMN is_on_promotion BOOLEAN DEFAULT 0;
            
            -- Copier les données de l'ancienne colonne si elle existe
            UPDATE products_product 
            SET discount_percentage = discount_percent
            WHERE EXISTS (SELECT 1 FROM pragma_table_info('products_product') WHERE name='discount_percent');
            """,
            # SQL pour annuler les changements
            """
            ALTER TABLE products_product DROP COLUMN discount_percentage;
            ALTER TABLE products_product DROP COLUMN is_on_promotion;
            """
        ),
    ] 