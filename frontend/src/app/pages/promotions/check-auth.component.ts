import { Component, OnInit } from '@angular/core';
import { AuthAdminService } from '../../services/auth-admin.service';

@Component({
  selector: 'app-check-auth',
  template: `
    <div style="padding: 20px; background: #f5f5f5; border-radius: 8px; margin: 20px;">
      <h2>Vérification de l'authentification admin</h2>
      
      <div *ngIf="isAdmin" style="color: green; margin: 15px 0;">
        ✅ Vous êtes connecté en tant qu'administrateur
      </div>
      
      <div *ngIf="!isAdmin" style="color: red; margin: 15px 0;">
        ❌ Vous n'êtes PAS connecté en tant qu'administrateur
      </div>
      
      <div style="margin: 15px 0;">
        <strong>Token admin:</strong> 
        <code style="display: block; padding: 10px; background: #eee; margin-top: 5px; overflow-wrap: break-word;">
          {{ adminToken || 'Aucun token trouvé' }}
        </code>
      </div>
      
      <div style="margin: 15px 0;">
        <strong>Utilisateur admin:</strong>
        <pre style="padding: 10px; background: #eee; margin-top: 5px;">{{ adminUserJson }}</pre>
      </div>
      
      <button (click)="checkAuthentication()" style="background: #3f51b5; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer;">
        Vérifier à nouveau
      </button>
      
      <button *ngIf="isAdmin" (click)="testEndpoint()" style="background: #4caf50; color: white; padding: 10px 15px; border: none; border-radius: 4px; cursor: pointer; margin-left: 10px;">
        Tester l'endpoint promotions
      </button>
      
      <div *ngIf="endpointResponse" style="margin-top: 15px;">
        <strong>Réponse de l'endpoint:</strong>
        <pre style="padding: 10px; background: #eee; margin-top: 5px;">{{ endpointResponse }}</pre>
      </div>
    </div>
  `,
  standalone: true,
  imports: [/* CommonModule sera ajouté par Angular */]
})
export class CheckAuthComponent implements OnInit {
  isAdmin = false;
  adminToken: string | null = null;
  adminUser: any = null;
  adminUserJson = '';
  endpointResponse = '';

  constructor(private authAdminService: AuthAdminService) {}

  ngOnInit(): void {
    this.checkAuthentication();
  }

  checkAuthentication(): void {
    this.isAdmin = this.authAdminService.isAdminAuthenticated();
    this.adminToken = this.authAdminService.getAdminToken();
    this.adminUser = this.authAdminService.getAdminUser();
    this.adminUserJson = this.adminUser ? JSON.stringify(this.adminUser, null, 2) : 'Aucun utilisateur trouvé';
  }

  testEndpoint(): void {
    // Ceci serait implémenté avec HttpClient pour tester l'accès à l'endpoint
    this.endpointResponse = "Test non implémenté - Veuillez vérifier la console pour les erreurs d'authentification";
  }
} 