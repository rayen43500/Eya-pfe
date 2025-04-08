import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'frontend';
  currentUrl: string = '';

  constructor(
    public authService: AuthService,
    public router: Router
  ) {
    this.router.events.subscribe((event: any) => {
      this.currentUrl = event.url;
    });
  }

  isAuthPath(): boolean {
    // Hide navbar on login/register pages
    return this.router.url.includes('login') || 
           this.router.url.includes('register') || 
           this.router.url.includes('auth-reset');
  }

  logout(event: Event): void {
    event.preventDefault();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
