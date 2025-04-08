import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthUtilService } from '../../services/auth-util.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { AuthClientService } from '../../services/auth-client.service';

@Component({
  selector: 'app-auth-reset',
  template: `
    <div class="auth-reset-container">
      <div class="card">
        <div class="card-header bg-primary text-white">
          <h2>Réinitialisation de l'authentification</h2>
        </div>
        <div class="card-body">
          <p>Utilisez cette page pour résoudre les problèmes d'authentification.</p>
          
          <div class="alert alert-warning">
            <strong>Attention:</strong> Cette action va effacer toutes vos données de connexion et vous devrez vous reconnecter.
          </div>
          
          <div class="auth-status">
            <h3>État actuel de l'authentification</h3>
            <ul>
              <li>Type d'utilisateur: <strong>{{ userType || 'Non défini' }}</strong></li>
              <li>Token principal: <strong>{{ hasMainToken ? 'Présent' : 'Absent' }}</strong></li>
              <li>Token client: <strong>{{ hasClientToken ? 'Présent' : 'Absent' }}</strong></li>
              <li>Token admin: <strong>{{ hasAdminToken ? 'Présent' : 'Absent' }}</strong></li>
            </ul>
          </div>
          
          <div class="actions mt-4">
            <button class="btn btn-success mb-3" (click)="redirectToDashboard()" *ngIf="userType">
              Accéder à mon espace {{ userType }}
            </button>
            <br>
            <button class="btn btn-danger mr-3" (click)="resetAuth()">
              Réinitialiser l'authentification
            </button>
            <button class="btn btn-secondary" (click)="goBack()">
              Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-reset-container {
      max-width: 600px;
      margin: 50px auto;
    }
    .auth-status {
      margin-top: 20px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 5px;
    }
    .actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
    }
    .btn {
      min-width: 200px;
    }
  `],
  standalone: true,
  imports: [CommonModule]
})
export class AuthResetComponent {
  userType = localStorage.getItem('user_type');
  hasMainToken = !!localStorage.getItem('access_token');
  hasClientToken = !!localStorage.getItem('client_token');
  hasAdminToken = !!localStorage.getItem('admin_token');

  constructor(
    private authUtilService: AuthUtilService,
    private authService: AuthService,
    private authClientService: AuthClientService,
    private router: Router
  ) {}

  resetAuth(): void {
    this.authUtilService.clearAllAuthData();
    alert('Authentification réinitialisée avec succès. Veuillez vous reconnecter.');
    this.router.navigate(['/']);
  }

  redirectToDashboard(): void {
    // Rediriger l'utilisateur vers le dashboard correspondant à son type
    const userType = localStorage.getItem('user_type');
    
    if (userType === 'admin') {
      window.location.href = '/admin-dashboard';
    } else if (userType === 'client') {
      window.location.href = '/direct-shoop-bord';
    } else if (userType === 'livreur') {
      window.location.href = '/livreur-dashboard';
    } else {
      alert('Type d\'utilisateur inconnu. Veuillez vous reconnecter.');
      this.resetAuth();
    }
  }

  goBack(): void {
    this.router.navigate(['/']);
  }
} 