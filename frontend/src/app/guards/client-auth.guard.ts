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
export class ClientAuthGuard implements CanActivate, CanActivateChild {
  
  constructor(private authService: AuthService, private router: Router) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkClientAccess(state.url);
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkClientAccess(state.url);
  }
  
  private checkClientAccess(url: string): boolean {
    // Mode développement - pour faciliter le test sans authentification
    const isDevMode = true;  // Activé pour le développement
    
    if (isDevMode) {
      console.log('🔑 Mode développement: Accès client autorisé automatiquement');
      return true;
    }
    
    if (this.authService.isLoggedIn()) {
      if (this.authService.isClient()) {
        return true;
      } else {
        // L'utilisateur est connecté mais n'est pas un client
        console.log('Utilisateur connecté mais pas comme client');
        this.router.navigate(['/login-client']);
        return false;
      }
    }
    
    // L'utilisateur n'est pas connecté
    // Stocker l'URL de retour pour la redirection après la connexion
    console.log('Utilisateur non connecté, redirection vers la page de connexion client');
    this.router.navigate(['/login-client'], { queryParams: { returnUrl: url } });
    return false;
  }
} 