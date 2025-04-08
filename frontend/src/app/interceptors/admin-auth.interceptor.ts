import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthAdminService } from '../services/auth-admin.service';

@Injectable()
export class AdminAuthInterceptor implements HttpInterceptor {
  constructor(private authAdminService: AuthAdminService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Ne pas ajouter de token aux endpoints d'authentification
    if (request.url.includes('/api/token/') || 
        request.url.includes('/accounts/api/login/') || 
        request.url.includes('/api/login/') || 
        request.url.includes('/login/livreur/') ||
        request.url.includes('/login/client/') ||
        request.url.includes('/login/admin/') ||
        request.url.includes('/register/')) {
      console.log('🔑 Requête d\'authentification admin, transmission sans modification');
      return next.handle(request);
    }

    // Vérifier si c'est une requête admin
    if (localStorage.getItem('user_type') === 'admin') {
      try {
        const token = this.authAdminService.getAdminToken();
        
        if (token) {
          console.log('👤 Ajout du token JWT admin à la requête:', request.url);
          request = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
        } else {
          console.log('Pas de token admin valide trouvé pour la requête:', request.url);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du token admin:', error);
        // Nettoyer les tokens invalides
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
      }
    }
    
    return next.handle(request);
  }
} 