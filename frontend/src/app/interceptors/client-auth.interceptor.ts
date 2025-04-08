import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthClientService } from '../services/auth-client.service';

@Injectable()
export class ClientAuthInterceptor implements HttpInterceptor {
  constructor(private authClientService: AuthClientService) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Mode développement - pour faciliter le test sans authentification
    const isDevMode = true;  // Activé pour le développement
    
    // Ne pas ajouter de token aux endpoints d'authentification
    if (request.url.includes('/api/token/') || 
        request.url.includes('/accounts/api/login/') || 
        request.url.includes('/api/login/') || 
        request.url.includes('/login/livreur/') ||
        request.url.includes('/login/client/') ||
        request.url.includes('/login/admin/') ||
        request.url.includes('/register/')) {
      console.log('🔑 Requête d\'authentification client, transmission sans modification');
      return next.handle(request);
    }
    
    // En mode développement, toujours ajouter un token fictif
    if (isDevMode) {
      console.log('🛒 Mode développement: ajout du token fictif à la requête:', request.url);
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.tHDR9dxQD4JbVuUe4tksFr6wz8qFCnkJpJl9V0wDXXX';
      
      request = request.clone({
        setHeaders: {
          Authorization: `Bearer ${fakeToken}`
        }
      });
      return next.handle(request);
    }
    
    // Fonctionnement normal en production
    // Vérifier si c'est une requête client
    if (localStorage.getItem('user_type') === 'client') {
      try {
        const token = this.authClientService.getClientToken();
        
        if (token) {
          console.log('✅ Token client ajouté à la requête:', request.url);
          request = request.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
        } else {
          console.log('⚠️ Pas de token client valide trouvé pour la requête:', request.url);
        }
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du token client:', error);
        // Nettoyer les tokens invalides
        localStorage.removeItem('client_token');
        localStorage.removeItem('client_refresh_token');
      }
    }
    
    return next.handle(request);
  }
} 