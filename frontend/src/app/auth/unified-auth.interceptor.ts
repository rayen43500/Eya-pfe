import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuthClientService } from '../services/auth-client.service';
import { AuthAdminService } from '../services/auth-admin.service';
import { Router } from '@angular/router';

@Injectable()
export class UnifiedAuthInterceptor implements HttpInterceptor {
  
  constructor(
    private authService: AuthService,
    private authClientService: AuthClientService,
    private authAdminService: AuthAdminService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Journalisation pour le débogage
    console.log(`🔍 UnifiedAuthInterceptor - URL: ${request.url}`);

    // 1. IGNORER LES REQUÊTES D'AUTHENTIFICATION
    if (this.isAuthRequest(request.url)) {
      console.log('🔐 Requête d\'authentification, aucune modification');
      return next.handle(request);
    }

    // 2. ÉVITER LA DOUBLE AUTHENTIFICATION
    if (request.headers.has('Authorization')) {
      console.log('🔄 Requête déjà authentifiée');
      return next.handle(request);
    }

    // 3. OBTENIR LE TYPE D'UTILISATEUR
    const userType = localStorage.getItem('user_type');
    console.log(`👤 Type d'utilisateur: ${userType || 'non connecté'}`);

    // 4. APPLIQUER LE TOKEN APPROPRIÉ
    let authReq = request;
    let token = null;

    if (userType === 'admin') {
      token = this.authAdminService.getAdminToken();
      console.log('👑 Token Admin:', token ? 'présent' : 'absent');
    } else if (userType === 'client') {
      token = this.authClientService.getClientToken();
      console.log('🛒 Token Client:', token ? 'présent' : 'absent');
    } else if (userType === 'livreur') {
      token = this.authService.getAccessToken();
      console.log('🚚 Token Livreur:', token ? 'présent' : 'absent');
    } else {
      // Pas de user_type défini
      token = this.authService.getAccessToken();
      console.log('🔑 Token générique:', token ? 'présent' : 'absent');
    }

    // Ajouter le token s'il existe
    if (token) {
      authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
      console.log('✅ Token ajouté à la requête');
    } else {
      console.log('⚠️ Aucun token disponible');
    }

    // Gérer les erreurs d'authentification
    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log('🔒 Erreur 401 - Tentative de rafraîchissement du token');
          
          // Rafraîchir le token selon le type d'utilisateur
          if (userType === 'admin') {
            return this.refreshAdminToken(request, next);
          } else if (userType === 'client') {
            return this.refreshClientToken(request, next);
          } else if (userType === 'livreur') {
            return this.refreshLivreurToken(request, next);
          } else {
            return this.refreshMainToken(request, next);
          }
        }
        return throwError(() => error);
      })
    );
  }

  // Vérifier si c'est une requête d'authentification
  private isAuthRequest(url: string): boolean {
    const authEndpoints = [
      '/api/token/',
      '/accounts/api/login/',
      '/api/login/',
      '/login/livreur/',
      '/login/client/',
      '/login/admin/',
      '/register/'
    ];
    
    // Ignorer aussi les routes de statistiques et rapports
    const publicRoutes = [
      '/reports',
      '/direct-statistics',
      '/statistics'
    ];
    
    return authEndpoints.some(endpoint => url.includes(endpoint)) || 
           publicRoutes.some(route => url.includes(route));
  }

  // Méthodes de rafraîchissement du token selon le type d'utilisateur
  private refreshMainToken(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authService.refreshToken().pipe(
      switchMap(() => {
        const token = this.authService.getAccessToken();
        if (!token) {
          this.authService.logout();
          return throwError(() => new Error('Échec du rafraîchissement du token'));
        }
        
        const authReq = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(authReq);
      }),
      catchError(error => {
        this.authService.logout();
        return throwError(() => error);
      })
    );
  }

  private refreshClientToken(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authClientService.refreshClientToken().pipe(
      switchMap(() => {
        const token = this.authClientService.getClientToken();
        if (!token) {
          this.authClientService.logout();
          return throwError(() => new Error('Échec du rafraîchissement du token client'));
        }
        
        const authReq = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(authReq);
      }),
      catchError(error => {
        this.authClientService.logout();
        return throwError(() => error);
      })
    );
  }

  private refreshAdminToken(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authAdminService.refreshAdminToken().pipe(
      switchMap(() => {
        const token = this.authAdminService.getAdminToken();
        if (!token) {
          this.authAdminService.logout();
          return throwError(() => new Error('Échec du rafraîchissement du token admin'));
        }
        
        const authReq = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(authReq);
      }),
      catchError(error => {
        this.authAdminService.logout();
        return throwError(() => error);
      })
    );
  }

  private refreshLivreurToken(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return this.authService.refreshToken().pipe(
      switchMap(() => {
        const token = this.authService.getAccessToken();
        if (!token) {
          this.authService.logout();
          return throwError(() => new Error('Échec du rafraîchissement du token livreur'));
        }
        
        const authReq = request.clone({
          headers: request.headers.set('Authorization', `Bearer ${token}`)
        });
        return next.handle(authReq);
      }),
      catchError(error => {
        this.authService.logout();
        return throwError(() => error);
      })
    );
  }
} 