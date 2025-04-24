import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
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

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Vérifier d'abord si nous sommes en mode invité
    if (this.authClientService.isGuestMode()) {
      console.log('Mode invité: skip auth pour la requête:', request.url);
      // En mode invité, nous n'ajoutons pas de token d'authentification
      return next.handle(request).pipe(
        catchError(error => {
          // Ignorer les erreurs 401 en mode invité
          if (error instanceof HttpErrorResponse && error.status === 401) {
            console.log('Erreur 401 ignorée en mode invité');
            // Retourner un observable vide au lieu de l'erreur elle-même
            return new Observable<HttpEvent<unknown>>(observer => {
              observer.complete();
            });
          }
          return throwError(() => error);
        })
      );
    }

    // Cas standard (pas en mode invité)
    // Vérifier si c'est une requête d'authentification
    if (this.isAuthRequest(request)) {
      return next.handle(request);
    }

    // Déterminer le type d'utilisateur en fonction des tokens disponibles
    const userType = localStorage.getItem('user_type');

    if (userType === 'admin') {
      return this.handleAdminRequest(request, next);
    } else if (userType === 'client') {
      return this.handleClientRequest(request, next);
    } else {
      // Aucun type d'utilisateur défini, requête sans authentification
      return next.handle(request);
    }
  }

  // Vérifier si c'est une requête d'authentification
  private isAuthRequest(request: HttpRequest<unknown>): boolean {
    const authEndpoints = [
      '/api/token/',
      '/accounts/api/login/',
      '/api/login/',
      '/login/livreur/',
      '/login/client/',
      '/login/admin/',
      '/register/'
    ];
    
    // Ignorer aussi les routes de statistiques, rapports et API publique
    const publicRoutes = [
      '/reports',
      '/direct-statistics',
      '/statistics',
      '/api/products/',
      '/api/categories/'
    ];
    
    return authEndpoints.some(endpoint => request.url.includes(endpoint)) || 
           publicRoutes.some(route => request.url.includes(route));
  }

  // Méthodes de rafraîchissement du token selon le type d'utilisateur
  private handleAdminRequest(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
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

  private handleClientRequest(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
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
} 