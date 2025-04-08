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
export class AdminAuthGuard implements CanActivate, CanActivateChild {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkAdminAccess();
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkAdminAccess();
  }
  
  private checkAdminAccess(): boolean {
    // Mode développement - pour faciliter le test sans authentification
    const isDevMode = true;  // Activé pour le développement
    
    if (isDevMode) {
      console.log('🔑 Mode développement: Accès admin autorisé automatiquement');
      return true;
    }
    
    if (this.authService.isLoggedIn() && this.authService.isAdmin()) {
      return true;
    }
    
    // Redirect to admin login page if not logged in or not an admin
    this.router.navigate(['/login']);
    return false;
  }
} 