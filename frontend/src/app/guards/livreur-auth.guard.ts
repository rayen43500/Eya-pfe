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
export class LivreurAuthGuard implements CanActivate, CanActivateChild {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkLivreurAccess();
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkLivreurAccess();
  }
  
  private checkLivreurAccess(): boolean {
    if (this.authService.isLoggedIn() && this.authService.isLivreur()) {
      return true;
    }
    
    // Redirect to livreur login page if not logged in or not a livreur
    this.router.navigate(['/login-livreur']);
    return false;
  }
} 