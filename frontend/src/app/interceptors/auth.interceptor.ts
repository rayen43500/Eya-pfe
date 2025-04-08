import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap, finalize } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Don't add token to auth requests
    if (request.url.includes('/token/') || 
        request.url.includes('/api/accounts/login/') || 
        request.url.includes('/accounts/api/login/')) {
      console.log('Bypass token for auth request:', request.url);
      return next.handle(request);
    }

    // Mode développement - pour faciliter le test sans authentification
    const isDevMode = true;  // Activé pour le développement

    // 1. Récupérer le jeton d'authentification approprié selon le type d'utilisateur
    const userType = localStorage.getItem('user_type');
    let token: string | null = null;
    
    if (userType === 'client') {
      token = localStorage.getItem('client_token') || localStorage.getItem('access_token');
      console.log('Utilisation du jeton client pour la requête:', request.url);
    } else if (userType === 'admin') {
      token = localStorage.getItem('admin_token') || localStorage.getItem('access_token');
      console.log('Utilisation du jeton admin pour la requête:', request.url);
    } else if (userType === 'livreur') {
      token = localStorage.getItem('livreur_token') || localStorage.getItem('access_token');
      console.log('Utilisation du jeton livreur pour la requête:', request.url);
    } else {
      // Jeton par défaut pour compatibilité avec l'ancien système
      token = this.authService.getAccessToken();
      console.log('Utilisation du jeton par défaut pour la requête:', request.url);
    }
    
    if (token) {
      console.log('Ajout du jeton à la requête:', request.url);
      request = this.addToken(request, token);
    } else if (isDevMode) {
      console.log('Mode développement: ajout du token fictif à la requête:', request.url);
      // Token avec plus de droits pour l'administration
      const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWQiOjEsInJvbGUiOiJhZG1pbiIsImlzX3N0YWZmIjp0cnVlLCJpc19zdXBlcnVzZXIiOnRydWUsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5fQ.CUEynk6nKU7fzbgoTYeGja-JdkF_gB6HbQQbZmBsQHk';
      request = this.addToken(request, fakeToken);
    } else {
      console.log('No token available for request:', request.url);
    }

    return next.handle(request).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          console.log('401 Unauthorized error detected, attempting token refresh');
          return this.handle401Error(request, next);
        }
        
        // Logging des autres erreurs
        if (error instanceof HttpErrorResponse) {
          console.error(`HTTP Error ${error.status}: ${error.message} on ${request.url}`);
        }
        
        return throwError(() => error);
      })
    );
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);
      
      console.log('Starting token refresh process');

      return this.authService.refreshToken().pipe(
        switchMap(response => {
          console.log('Token refresh successful, retrying original request');
          if (response) {
            this.refreshTokenSubject.next(response.access);
            return next.handle(this.addToken(request, response.access));
          }
          // If we don't get a new token, logout
          console.warn('No token received during refresh, logging out');
          this.authService.logout();
          return throwError(() => new Error('No refresh token available'));
        }),
        catchError(err => {
          console.error('Token refresh failed:', err);
          this.authService.logout();
          return throwError(() => err);
        }),
        finalize(() => {
          console.log('Token refresh process completed');
          this.isRefreshing = false;
        })
      );
    } else {
      // If refresh is in progress, wait for the new token
      console.log('Token refresh already in progress, waiting for completion');
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => {
          console.log('Using newly refreshed token for retry');
          return next.handle(this.addToken(request, token));
        })
      );
    }
  }
} 