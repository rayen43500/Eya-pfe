import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule]
})
export class LoginComponent {
  user = {
    username: '',
    password: ''
  };
  errorMessage = '';
  loading = false;
  loginSuccess = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private location: Location
  ) {}

  login() {
    if (!this.user.username || !this.user.password) {
      this.errorMessage = 'Veuillez saisir un nom d\'utilisateur et un mot de passe';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.loginSuccess = false;

    console.log('Tentative de connexion admin avec:', this.user.username);

    this.authService.adminLogin(this.user.username, this.user.password).subscribe({
      next: (response: any) => {
        console.log('Connexion admin réussie', response);
        this.loading = false;
        this.loginSuccess = true;
        
        // La redirection est déjà gérée dans handleAuthResponse du service
      },
      error: (error) => {
        console.error('Échec de connexion admin', error);
        this.loading = false;
        this.loginSuccess = false;
        
        if (error.error) {
          if (typeof error.error === 'string') {
            this.errorMessage = error.error;
          } else if (typeof error.error === 'object') {
            const errorMessages = [];
            for (const key in error.error) {
              if (error.error.hasOwnProperty(key)) {
                errorMessages.push(`${key}: ${error.error[key]}`);
              }
            }
            this.errorMessage = errorMessages.join(', ');
          }
        } else {
          this.errorMessage = 'Identifiants invalides';
        }
      }
    });
  }
  
  goToDashboard() {
    console.log('Navigation vers le dashboard');
    this.authService.redirectToDashboard();
  }

  logout() {
    this.authService.logout();
  }
}
