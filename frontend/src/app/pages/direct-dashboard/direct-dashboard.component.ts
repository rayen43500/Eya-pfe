import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-direct-dashboard',
  template: `
    <div class="loading-container">
      <div class="spinner-border text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <p>Redirection vers votre espace...</p>
    </div>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .spinner-border {
      width: 3rem;
      height: 3rem;
      margin-bottom: 1rem;
    }
  `],
  standalone: true
})
export class DirectDashboardComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    // Identifier le type d'utilisateur et rediriger vers le dashboard approprié
    const userType = localStorage.getItem('user_type');
    
    console.log('🔎 Redirection directe - Type utilisateur détecté:', userType);
    
    // Utiliser une redirection plus directe via window.location
    setTimeout(() => {
      if (userType === 'admin') {
        console.log('👨‍💼 Redirection vers dashboard admin');
        window.location.href = '/admin-dashboard';
      } else if (userType === 'client') {
        console.log('🛒 Redirection vers espace client');
        window.location.href = '/direct-shoop-bord';
      } else if (userType === 'livreur') {
        console.log('🚚 Redirection vers dashboard livreur');
        window.location.href = '/livreur-dashboard';
      } else {
        console.log('⚠️ Type utilisateur inconnu, redirection vers page de réinitialisation');
        this.router.navigate(['/auth-reset']);
      }
    }, 1000); // Délai réduit à 1 seconde
  }
} 