import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  CanActivateChild, 
  Router, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot 
} from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AuthClientService } from '../services/auth-client.service';

@Injectable({
  providedIn: 'root'
})
export class ClientAuthGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private authService: AuthService,
    private authClientService: AuthClientService,
    private router: Router
  ) {}
  
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkClientAccess(state.url, route);
  }
  
  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean {
    return this.checkClientAccess(state.url, childRoute);
  }
  
  private checkClientAccess(url: string, route: ActivatedRouteSnapshot): boolean {
    // Vérifier si l'URL concerne la boutique ou la page d'accueil
    if (url.includes('shoop-bord') || url === '/' || url === '' || url.includes('direct-shoop-bord')) {
      console.log('✅ Accès direct à la boutique autorisé sans vérification');
      return true;
    }
    
    // Autoriser aussi l'accès aux images et aux assets
    if (url.includes('/assets/') || url.includes('/images/')) {
      return true;
    }
    
    // Pour les autres pages du client (comme le panier, les commandes, etc.), vérifier l'authentification
    if (this.authService.isLoggedIn() || this.authClientService.isClientAuthenticated()) {
      return true;
    }
    
    // Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    this.router.navigate(['/login-client'], { queryParams: { returnUrl: url } });
    return false;
  }
} 