import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { VEHICLE_TYPES } from '../../shared/order-constants';

@Component({
  selector: 'app-livreur-signup',
  templateUrl: './livreur-signup.component.html',
  styleUrls: ['./livreur-signup.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule]
})
export class LivreurSignupComponent implements OnInit {
  signupForm: FormGroup;
  isSubmitting = false;
  error = '';
  successMessage = '';
  vehicleTypes = VEHICLE_TYPES;
  
  // Pour le téléchargement de photo
  selectedFile: File | null = null;
  previewUrl: string | ArrayBuffer | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.signupForm = this.formBuilder.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      vehicle: ['moto', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      postalCode: ['', [Validators.required, Validators.pattern(/^\d{5}$/)]],
      idCard: [null, Validators.required],
      drivingLicense: [null, Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    // Rediriger si déjà connecté
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/livreur/dashboard']);
    }
  }

  /**
   * Validateur personnalisé pour vérifier que les mots de passe correspondent
   */
  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  /**
   * Vérifie si un champ du formulaire est invalide
   */
  isFieldInvalid(field: string): boolean {
    const formControl = this.signupForm.get(field);
    return !!formControl && formControl.invalid && (formControl.dirty || formControl.touched);
  }

  /**
   * Gère la sélection d'un fichier pour les pièces justificatives
   */
  onFileSelected(event: Event, fieldName: string): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      const file = input.files[0];
      
      if (fieldName === 'idCard' || fieldName === 'drivingLicense') {
        this.signupForm.get(fieldName)?.setValue(file);
        this.signupForm.get(fieldName)?.markAsDirty();

        // Créer un aperçu si c'est une image
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            if (fieldName === 'idCard') {
              this.previewUrl = reader.result;
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  /**
   * Soumet le formulaire d'inscription
   */
  onSubmit(): void {
    if (this.signupForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.signupForm.controls).forEach(key => {
        this.signupForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    this.error = '';
    this.successMessage = '';

    const formData = new FormData();
    const formValue = this.signupForm.value;
    
    // Ajouter les données du formulaire
    Object.keys(formValue).forEach(key => {
      if (key !== 'confirmPassword' && key !== 'termsAccepted' && 
          key !== 'idCard' && key !== 'drivingLicense') {
        formData.append(key, formValue[key]);
      }
    });
    
    // Ajouter les fichiers
    if (this.signupForm.get('idCard')?.value) {
      formData.append('id_card', this.signupForm.get('idCard')?.value);
    }
    
    if (this.signupForm.get('drivingLicense')?.value) {
      formData.append('driving_license', this.signupForm.get('drivingLicense')?.value);
    }

    // En mode développement, simuler l'inscription
    if (true) { // Toujours en mode développement pour l'instant
      setTimeout(() => {
        this.successMessage = 'Inscription réussie ! Votre compte sera activé après vérification de vos documents.';
        this.isSubmitting = false;
        
        // Rediriger après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/login-livreur']);
        }, 3000);
      }, 1500);
      return;
    }

    // En production, appeler le service d'authentification
    this.authService.registerLivreur(formData).subscribe({
      next: (response) => {
        this.successMessage = 'Inscription réussie ! Votre compte sera activé après vérification de vos documents.';
        this.isSubmitting = false;
        
        // Rediriger après 3 secondes
        setTimeout(() => {
          this.router.navigate(['/login-livreur']);
        }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Une erreur est survenue lors de l\'inscription. Veuillez réessayer.';
        this.isSubmitting = false;
        console.error(err);
      }
    });
  }
} 