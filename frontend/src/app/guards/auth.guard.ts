import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  Router, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot 
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkLogin();
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkLogin();
  }
  
  private checkLogin(): boolean {
    if (this.authService.isLoggedIn()) {
      return true;
    }
    
    // Store the attempted URL for redirecting after login
    const currentUrl = this.router.url;
    
    // Redirect to the login page
    this.router.navigate(['/login'], { queryParams: { returnUrl: currentUrl } });
    return false;
  }
} 