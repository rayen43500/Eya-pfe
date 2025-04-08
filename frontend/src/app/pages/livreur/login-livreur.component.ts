import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login-livreur',
  templateUrl: './login-livreur.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class LoginLivreurComponent implements OnInit {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  returnUrl: string = '/livreur/dashboard';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // Rediriger si déjà connecté
    if (this.authService.isLoggedIn() && this.authService.isLivreur()) {
      this.router.navigate(['/livreur/dashboard']);
      return;
    }
    
    // Récupérer l'URL de retour des paramètres de requête ou utiliser la valeur par défaut
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/livreur/dashboard';
    
    // Pré-remplir les identifiants en mode développement
    if (true) { // Mode développement
      this.username = 'livreur1';
      this.password = 'password';
    }
  }

  onSubmit(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Valider les entrées
    if (!this.username || !this.password) {
      this.errorMessage = 'Veuillez saisir votre nom d\'utilisateur et votre mot de passe.';
      this.isLoading = false;
      return;
    }

    this.authService.livreurLogin(this.username, this.password).subscribe({
      next: (response) => {
        console.log('Connexion livreur réussie');
        this.isLoading = false;
        this.router.navigate([this.returnUrl]);
      },
      error: (error) => {
        console.error('Erreur de connexion livreur:', error);
        this.isLoading = false;
        
        if (error.status === 401) {
          this.errorMessage = 'Identifiants incorrects. Veuillez réessayer.';
        } else if (error.status === 403) {
          this.errorMessage = 'Votre compte n\'est pas encore approuvé ou a été désactivé.';
        } else {
          this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
        }
        
        // En mode développement, simuler une connexion réussie
        if (true) { // Mode développement
          console.log('Mode développement: simulation de connexion réussie');
          setTimeout(() => {
            this.router.navigate(['/livreur/dashboard']);
          }, 1000);
        }
      }
    });
  }
} 