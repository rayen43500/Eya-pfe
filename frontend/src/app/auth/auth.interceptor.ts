import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { AuthClientService } from '../services/auth-client.service';
import { AuthAdminService } from '../services/auth-admin.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    private authService: AuthService,
    private authClientService: AuthClientService, 
    private authAdminService: AuthAdminService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // IMPORTANT: Log détaillé pour débogage
    console.log(`🔍 DEBUG - AuthInterceptor - URL: ${req.url}`);
    
    // Ne pas ajouter de token aux endpoints d'authentification
    if (req.url.includes('/api/token/') || 
        req.url.includes('/accounts/api/login/') || 
        req.url.includes('/api/login/') || 
        req.url.includes('/login/livreur/') ||
        req.url.includes('/login/client/') ||
        req.url.includes('/login/admin/') ||
        req.url.includes('/register/')) {
      console.log('🔑 Requête d\'authentification, transmission sans modification');
      return next.handle(req);
    }
    
    // Vérifier le type d'utilisateur connecté
    const userType = localStorage.getItem('user_type');
    const token = this.authService.getAccessToken();
    
    console.log(`🔒 Intercepteur Auth: ${req.url}`);
    console.log(`📌 Type utilisateur: ${userType || 'non connecté'}`);
    console.log(`🔑 Token principal: ${token ? 'présent' : 'absent'}`);
    
    // Si la requête est déjà authentifiée, ne pas ajouter de token
    if (req.headers.has('Authorization')) {
      console.log('🔄 Requête déjà authentifiée, transmission sans modification');
      return next.handle(req);
    }

    let authReq = req;
    
    // Utiliser prioritairement le token principal s'il existe
    if (token) {
      console.log('🔐 Utilisation du token principal');
      authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
    }
    // Sinon utiliser les tokens spécifiques par rôle
    else if (userType === 'client') {
      const clientToken = this.authClientService.getClientToken();
      
      if (clientToken) {
        console.log('✅ Token client trouvé, ajout en-tête Authorization');
        authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${clientToken}`)
        });
      } else {
        console.log('⚠️ Type utilisateur client mais aucun token client valide');
      }
    } else if (userType === 'admin') {
      const adminToken = this.authAdminService.getAdminToken();
      
      if (adminToken) {
        console.log('✅ Token admin trouvé, ajout en-tête Authorization');
        authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${adminToken}`)
        });
      } else {
        console.log('⚠️ Type utilisateur admin mais aucun token admin valide');
      }
    } else {
      console.log('ℹ️ Utilisateur non authentifié ou type non reconnu');
    }

    return next.handle(authReq).pipe(
      tap(event => {
        if (event instanceof HttpResponse) {
          console.log(`✅ Réponse HTTP ${event.status} reçue pour ${req.url}`);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`❌ Erreur HTTP ${error.status} pour ${req.url}: ${error.message}`);
        
        if (error.status === 0) {
          console.error('🌐 Erreur de connexion au serveur (status 0)');
        }
        
        // Gérer l'erreur 401 Unauthorized
        if (error.status === 401) {
          console.log(`🚫 Erreur 401 pour ${req.url} - Type utilisateur: ${userType || 'non connecté'}`);
          
          // Vérifier si l'erreur contient un message de JWT invalide
          const errorMsg = error.error?.detail || '';
          console.log('📄 Détails erreur 401:', errorMsg);
          
          if (errorMsg.includes('token') || errorMsg.includes('JWT')) {
            console.error('Détails de l\'erreur JWT:', errorMsg);
            
            // Tentative de rafraîchissement de token selon le type d'utilisateur
            if (token) {
              return this.authService.refreshToken().pipe(
                switchMap(() => {
                  // Récupérer le nouveau token
                  const newToken = this.authService.getAccessToken();
                  
                  if (newToken) {
                    console.log('✅ Token principal rafraîchi avec succès');
                    // Cloner la requête avec le nouveau token
                    const newAuthReq = req.clone({
                      headers: req.headers.set('Authorization', `Bearer ${newToken}`)
                    });
                    return next.handle(newAuthReq);
                  } else {
                    console.log('❌ Échec du rafraîchissement du token principal');
                    this.authService.logout();
                    window.location.href = '/login';
                    return throwError(() => new Error('Échec rafraîchissement token principal'));
                  }
                }),
                catchError(refreshError => {
                  console.error('❌ Erreur lors du rafraîchissement du token principal:', refreshError);
                  this.authService.logout();
                  window.location.href = '/login';
                  return throwError(() => refreshError);
                })
              );
            }
            // Si c'est un utilisateur client
            else if (userType === 'client') {
              console.log('🔄 Tentative de rafraîchissement du token client');
              return this.refreshClientToken(authReq, next);
            } 
            // Si c'est un utilisateur admin
            else if (userType === 'admin') {
              console.log('🔄 Tentative de rafraîchissement du token admin');
              return this.refreshAdminToken(authReq, next);
            }
          }
        }
        
        // Pour les autres erreurs, les propager
        return throwError(() => error);
      })
    );
  }

  private refreshClientToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const refreshToken = localStorage.getItem('client_refresh_token');
    
    if (!refreshToken) {
      console.log('❌ Pas de token de rafraîchissement client disponible');
      this.authClientService.logout();
      this.router.navigate(['/login-client']);
      return throwError(() => new Error('Pas de token de rafraîchissement'));
    }
    
    return this.authClientService.refreshClientToken().pipe(
      switchMap(() => {
        // Récupérer le nouveau token
        const newToken = this.authClientService.getClientToken();
        
        if (!newToken) {
          console.log('❌ Échec du rafraîchissement du token client');
          this.authClientService.logout();
          this.router.navigate(['/login-client']);
          return throwError(() => new Error('Échec du rafraîchissement du token'));
        }
        
        console.log('✅ Token client rafraîchi avec succès');
        // Cloner la requête avec le nouveau token
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newToken}`)
        });
        
        // Renvoyer la requête avec le nouveau token
        return next.handle(authReq);
      }),
      catchError(error => {
        console.log('❌ Erreur lors du rafraîchissement du token client:', error);
        this.authClientService.logout();
        this.router.navigate(['/login-client']);
        return throwError(() => error);
      })
    );
  }

  private refreshAdminToken(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const refreshToken = localStorage.getItem('admin_refresh_token');
    
    if (!refreshToken) {
      console.log('❌ Pas de token de rafraîchissement admin disponible');
      this.authAdminService.logout();
      this.router.navigate(['/login']);
      return throwError(() => new Error('Pas de token de rafraîchissement admin'));
    }
    
    return this.authAdminService.refreshAdminToken().pipe(
      switchMap(() => {
        // Récupérer le nouveau token
        const newToken = this.authAdminService.getAdminToken();
        
        if (!newToken) {
          console.log('❌ Échec du rafraîchissement du token admin');
          this.authAdminService.logout();
          this.router.navigate(['/login']);
          return throwError(() => new Error('Échec du rafraîchissement du token admin'));
        }
        
        console.log('✅ Token admin rafraîchi avec succès');
        // Cloner la requête avec le nouveau token
        const authReq = req.clone({
          headers: req.headers.set('Authorization', `Bearer ${newToken}`)
        });
        
        // Renvoyer la requête avec le nouveau token
        return next.handle(authReq);
      }),
      catchError(error => {
        console.log('❌ Erreur lors du rafraîchissement du token admin:', error);
        this.authAdminService.logout();
        this.router.navigate(['/login']);
        return throwError(() => error);
      })
    );
  }
} 