import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  enabled: boolean;
}

interface PaymentMethod {
  id: string;
  name: string;
  enabled: boolean;
  config: Record<string, string>;
}

@Component({
  selector: 'app-parametres',
  standalone: false,
  templateUrl: './parametres.component.html',
  styleUrl: './parametres.component.css'
})
export class ParametresComponent implements OnInit {
  siteInfo = {
    name: 'MaBoutique',
    description: 'Boutique en ligne spécialisée dans la vente de produits de qualité.',
    email: 'contact@maboutique.com',
    phone: '+33 1 23 45 67 89'
  };

  designSettings = {
    logo: 'https://via.placeholder.com/150x50',
    primaryColor: '#3498db',
    secondaryColor: '#2ecc71'
  };

  paymentMethods: PaymentMethod[] = [
    {
      id: 'card',
      name: 'Carte bancaire',
      enabled: true,
      config: {
        apiKey: 'sk_test_example123456789',
        publicKey: 'pk_test_example123456789'
      }
    },
    {
      id: 'paypal',
      name: 'PayPal',
      enabled: true,
      config: {
        clientId: 'paypal_client_example123',
        secret: 'paypal_secret_example123'
      }
    }
  ];

  shippingMethods: ShippingMethod[] = [
    {
      id: 'standard',
      name: 'Livraison standard',
      price: 5.90,
      enabled: true
    },
    {
      id: 'express',
      name: 'Livraison express',
      price: 12.90,
      enabled: true
    },
    {
      id: 'free',
      name: 'Livraison gratuite à partir de',
      price: 50,
      enabled: false
    }
  ];

  emailConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    user: 'contact@maboutique.com',
    password: 'password123'
  };

  ngOnInit(): void {
    // Initialiser les données si nécessaire
  }

  saveSettings(): void {
    console.log('Enregistrement des paramètres');
    // Envoyer les données au serveur
  }

  uploadLogo(): void {
    console.log('Téléchargement du logo');
    // Ouvrir une boîte de dialogue pour sélectionner un fichier
  }

  togglePaymentMethod(id: string, enabled: boolean): void {
    const method = this.paymentMethods.find(m => m.id === id);
    if (method) {
      method.enabled = enabled;
    }
  }

  addShippingMethod(): void {
    console.log('Ajout d\'une méthode de livraison');
    // Ajouter une nouvelle méthode de livraison
  }

  sendTestEmail(): void {
    console.log('Envoi d\'un email de test');
    // Envoyer un email de test pour vérifier la configuration
  }
}
