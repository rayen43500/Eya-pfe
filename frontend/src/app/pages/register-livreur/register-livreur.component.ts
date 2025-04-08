import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register-livreur',
  templateUrl: './register-livreur.component.html',
  styleUrls: ['./register-livreur.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class RegisterLivreurComponent implements OnInit {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  vehicleTypes = [
    { value: 'velo', label: 'Vélo' },
    { value: 'moto', label: 'Moto' },
    { value: 'voiture', label: 'Voiture' }
  ];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.registerForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      phone_number: ['', [Validators.required, Validators.pattern('^[0-9+]{8,15}$')]],
      vehicle_type: ['velo', Validators.required],
      password1: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
  }

  // Validateur personnalisé pour vérifier que les mots de passe correspondent
  passwordMatchValidator(g: FormGroup) {
    const password1 = g.get('password1')?.value;
    const password2 = g.get('password2')?.value;
    return password1 === password2 ? null : { 'mismatch': true };
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = '';
      this.successMessage = '';
      
      const formData = this.registerForm.value;
      
      // Appel à l'API d'enregistrement des livreurs
      this.http.post(`${environment.apiUrl}/accounts/api/register/livreur/`, formData)
        .subscribe({
          next: (response: any) => {
            this.isLoading = false;
            this.successMessage = 'Compte livreur créé avec succès! Redirection vers la page de connexion...';
            
            // Redirection après 2 secondes
            setTimeout(() => {
              this.router.navigate(['/login-livreur']);
            }, 2000);
          },
          error: (error) => {
            this.isLoading = false;
            console.error('Erreur d\'inscription:', error);
            
            if (error.status === 400) {
              // Erreurs de validation
              if (error.error) {
                const errorMessages = [];
                for (const key in error.error) {
                  if (error.error.hasOwnProperty(key)) {
                    errorMessages.push(`${key}: ${error.error[key]}`);
                  }
                }
                this.errorMessage = errorMessages.join('\n');
              } else {
                this.errorMessage = 'Données invalides';
              }
            } else {
              this.errorMessage = 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
            }
          }
        });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
    }
  }
} 