import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule]
})
export class RegisterComponent {
  user = {
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: ''
  };
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  register() {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    this.http.post(`${environment.apiUrl}/auth/register/`, this.user, { headers })
      .subscribe({
        next: (response: any) => {
          console.log('Registration successful', response);
          this.router.navigate(['/login']);
        },
        error: (error) => {
          console.error('Registration failed', error);
          if (error.error && typeof error.error === 'object') {
            const errorMessages = [];
            for (const key in error.error) {
              if (error.error.hasOwnProperty(key)) {
                errorMessages.push(`${key}: ${error.error[key]}`);
              }
            }
            this.errorMessage = errorMessages.join(', ');
          } else {
            this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
          }
        }
      });
  }

  getUserProfile() {
    const headers = new HttpHeaders({
      'Authorization': `Token ${localStorage.getItem('token')}`,
      'Content-Type': 'application/json'
    });

    return this.http.get(`${environment.apiUrl}/auth/profile/`, { headers });
  }
} 