import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class LivreurAuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ne pas ajouter de token aux endpoints d'authentification
    if (request.url.includes('/api/token/') || 
        request.url.includes('/accounts/api/login/') || 
        request.url.includes('/api/login/') || 
        request.url.includes('/login/livreur/') ||
        request.url.includes('/login/client/') ||
        request.url.includes('/login/admin/') ||
        request.url.includes('/register/')) {
      console.log('🔑 Requête d\'authentification livreur, transmission sans modification');
      return next.handle(request);
    }

    // On ne modifie que les requêtes vers notre API
    if (request.url.includes('localhost:8000/api/')) {
      const token = this.authService.getAccessToken();

      // Si un token existe et que l'utilisateur est un livreur
      if (token && this.authService.isLivreur()) {
        console.log('👤 Ajout du token JWT livreur à la requête:', request.url);
        const authReq = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(authReq);
      }
    }
    return next.handle(request);
  }
} 