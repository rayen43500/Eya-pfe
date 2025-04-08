import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthClientService } from '../../../services/auth-client.service';
import { Location } from '@angular/common';

// Interface pour les données d'inscription client
interface ClientRegistrationData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  delivery_address: string;
  phone_number: string;
  password: string;
  password2: string;
}

@Component({
  selector: 'app-login-client',
  templateUrl: './login-client.component.html',
  styleUrls: ['./login-client.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule]
})
export class LoginClientComponent implements OnInit {
  loginForm!: FormGroup;
  registerForm!: FormGroup;
  loading = false;
  registerLoading = false;
  errorMessage = '';
  registerError = '';
  hidePassword = true;
  hideRegPassword = true;
  activeForm = 'login';
  passwordStrength = 0;
  registrationSuccess = false;
  registrationErrors: any = {};
  loginSuccess = false;

  // Propriétés pour l'inscription client
  registrationData: ClientRegistrationData = {
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    delivery_address: '',
    phone_number: '',
    password: '',
    password2: ''
  };

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    public authClientService: AuthClientService,
    private location: Location
  ) {}

  ngOnInit(): void {
    this.initLoginForm();
    this.initRegisterForm();
  }

  initLoginForm(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  initRegisterForm(): void {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      delivery_address: [''],
      phone_number: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Synchroniser les données du formulaire avec l'objet registrationData
    this.registerForm.valueChanges.subscribe(values => {
      this.registrationData = {
        username: values.username,
        email: values.email,
        first_name: values.first_name,
        last_name: values.last_name,
        delivery_address: values.delivery_address,
        phone_number: values.phone_number,
        password: values.password,
        password2: values.password2
      };
      
      // Vérifier la force du mot de passe quand il change
      if (values.password) {
        this.checkPasswordStrength(values.password);
      }
    });
  }

  passwordMatchValidator(formGroup: FormGroup) {
    const password = formGroup.get('password')?.value;
    const password2 = formGroup.get('password2')?.value;
    return password === password2 ? null : { passwordMismatch: true };
  }

  login(): void {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      
      const credentials = {
        username: this.loginForm.value.username,
        password: this.loginForm.value.password
      };
      
      console.log('Tentative de connexion client avec:', credentials.username);
      
      this.authClientService.loginClient(credentials).subscribe({
        next: (response: any) => {
          console.log('Connexion client réussie', response);
          this.loading = false;
          this.loginSuccess = true;
          
          console.log('🔄 Préparation de la redirection vers ShopBord');
          
          // Redirection immédiate et directe via window.location
          window.location.href = '/direct-shoop-bord';
          
          // Solution de secours si la redirection directe ne fonctionne pas
          setTimeout(() => {
            if (!window.location.pathname.includes('/direct-shoop-bord')) {
              console.log('⚠️ Seconde tentative de redirection vers ShopBord');
              this.authClientService.redirectToShoopBord();
            }
          }, 1000);
        },
        error: (error: any) => {
          console.error('Échec de connexion client', error);
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
  }

  register(): void {
    if (this.registerForm.valid) {
      this.registerLoading = true;
      this.registerError = '';
      
      // S'assurer que tous les champs sont correctement nommés
      const formData = {
        username: this.registerForm.value.username,
        email: this.registerForm.value.email,
        first_name: this.registerForm.value.first_name,
        last_name: this.registerForm.value.last_name,
        delivery_address: this.registerForm.value.delivery_address,
        phone_number: this.registerForm.value.phone_number,
        password: this.registerForm.value.password,
        password2: this.registerForm.value.password2
      };
      
      this.authClientService.registerClient(formData).subscribe({
        next: (response: any) => {
          console.log('Inscription réussie', response);
          this.registrationSuccess = true;
          this.registerLoading = false;
          
          setTimeout(() => {
            this.switchForm('login');
            this.resetRegistrationForm();
          }, 1500);
        },
        error: (error: any) => {
          console.error('Échec de l\'inscription', error);
          this.registerLoading = false;
          
          if (error.error) {
            this.registrationErrors = error.error;
            
            if (typeof error.error === 'string') {
              this.registerError = error.error;
            } else {
              Object.keys(error.error).forEach(key => {
                if (this.registerForm.get(key)) {
                  this.registerForm.get(key)?.setErrors({ serverError: error.error[key] });
                } else {
                  this.registerError = `Erreur: ${error.error[key]}`;
                }
              });
            }
          } else {
            this.registerError = 'Une erreur est survenue lors de l\'inscription.';
          }
        }
      });
    }
  }

  switchForm(form: string): void {
    this.activeForm = form;
    this.errorMessage = '';
    this.registerError = '';
  }

  logout(): void {
    this.authClientService.logout();
  }

  checkPasswordStrength(password: string): void {
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    this.passwordStrength = strength;
  }

  // Méthode de réinitialisation du formulaire
  resetRegistrationForm(): void {
    this.registrationData = {
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      delivery_address: '',
      phone_number: '',
      password: '',
      password2: ''
    };
    this.registerForm.reset();
  }
} 