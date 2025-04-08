import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

// Interfaces
export interface ClientLoginResponse {
  user: any;
  access: string;
  refresh: string;
}

export interface ClientRegistrationData {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  delivery_address: string;
  phone_number: string;
  password: string;
  password2: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthClientService {
  private readonly CLIENT_TOKEN_KEY = 'client_token';
  private readonly CLIENT_REFRESH_TOKEN_KEY = 'client_refresh_token';
  private readonly CLIENT_USER_KEY = 'client_user';
  private jwtHelper = new JwtHelperService();
  
  private clientAuthStatusSubject = new BehaviorSubject<boolean>(this.isClientAuthenticated());
  public clientAuthStatus$ = this.clientAuthStatusSubject.asObservable();

  private apiUrl = 'http://localhost:8000/accounts/api/';
  private clientTokenSubject = new BehaviorSubject<string | null>(null);
  public clientToken = this.clientTokenSubject.asObservable();
  private refreshTokenTimeout: any;

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredToken();
    // Vérifier et nettoyer les conflits de token au démarrage
    this.cleanAuthConflicts();
  }

  private loadStoredToken() {
    const token = localStorage.getItem('client_token');
    if (token) {
      this.clientTokenSubject.next(token);
      this.startRefreshTokenTimer();
    }
  }

  // Nettoyer les conflits d'authentification entre client et admin
  cleanAuthConflicts(): void {
    const userType = localStorage.getItem('user_type');
    const clientToken = localStorage.getItem(this.CLIENT_TOKEN_KEY);
    const adminToken = localStorage.getItem('admin_token');
    
    // Si l'utilisateur est marqué comme client mais n'a pas de token client valide
    if (userType === 'client' && (!clientToken || !this.isValidJwtFormat(clientToken))) {
      console.log('🔄 Nettoyage des tokens client invalides');
      
      // Si c'est un conflit avec un token admin, définir l'utilisateur comme admin
      if (adminToken && this.isValidJwtFormat(adminToken)) {
        console.log('⚠️ Conflit détecté: token admin présent avec type utilisateur client');
        localStorage.setItem('user_type', 'admin');
      } else {
        // Si pas de token admin valide non plus, réinitialiser complètement
        console.log('🧹 Aucun token valide trouvé, nettoyage complet');
        this.clearAllTokens();
      }
    }
  }
  
  // Vérifier si une chaîne est au format JWT valide (a.b.c)
  private isValidJwtFormat(token: string): boolean {
    return token.split('.').length === 3;
  }
  
  // Supprimer tous les tokens d'authentification
  private clearAllTokens(): void {
    localStorage.removeItem(this.CLIENT_TOKEN_KEY);
    localStorage.removeItem(this.CLIENT_REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.CLIENT_USER_KEY);
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('user_type');
  }

  loginClient(credentials: { username: string, password: string }): Observable<ClientLoginResponse> {
    console.log(`👤 Tentative de connexion client avec nom d'utilisateur: ${credentials.username}`);
    
    // 1. Nettoyer toutes les données d'authentification existantes
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_refresh_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user_type');
    
    // 2. Format explicite des données de la requête
    const loginData = {
      username: credentials.username,
      password: credentials.password
    };
    
    console.log('📦 Données envoyées:', JSON.stringify(loginData));
    
    // Utilisation directe de l'API sans intercepteurs
    return this.http.post<ClientLoginResponse>(`${this.apiUrl}login/client/`, loginData)
      .pipe(
        tap(response => {
          console.log('🟢 Connexion client réussie:', response);
          
          // Stocker les informations du client dans les emplacements spécifiques
          localStorage.setItem('client_token', response.access);
          localStorage.setItem('client_refresh_token', response.refresh);
          localStorage.setItem(this.CLIENT_USER_KEY, JSON.stringify(response.user));
          
          // Également stocker dans les emplacements communs pour le partage avec AuthService
          localStorage.setItem('access_token', response.access);
          localStorage.setItem('refresh_token', response.refresh);
          localStorage.setItem('currentUser', JSON.stringify(response.user));
          localStorage.setItem('user_type', 'client');
          
          // Mettre à jour le sujet du token
          this.clientTokenSubject.next(response.access);
          this.startRefreshTokenTimer();
          
          // Mettre à jour le sujet du statut d'authentification
          this.clientAuthStatusSubject.next(true);
          
          console.log('🔐 Authentification client complète et jetons stockés');
        }),
        catchError(error => {
          console.error('🛑 Erreur de connexion client:', error);
          console.error('📄 Détails de l\'erreur:', error.error);
          return throwError(() => error);
        })
      );
  }

  registerClient(data: ClientRegistrationData): Observable<any> {
    return this.http.post(`${this.apiUrl}register/client/`, data)
      .pipe(
        catchError(error => {
          console.error('Erreur d\'inscription client:', error);
          return throwError(() => error);
        })
      );
  }

  getClientToken(): string | null {
    // Mode développement - pour faciliter le test sans authentification
    const isDevMode = true;  // Activé pour le développement
    
    if (isDevMode) {
      // En mode développement, générer un token factice si aucun n'est présent
      const storedToken = localStorage.getItem('client_token');
      if (!storedToken) {
        console.log('Mode développement: génération d\'un token factice');
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldiBVc2VyIiwiaWF0IjoxNjE2MjM5MDIyLCJleHAiOjk5OTk5OTk5OTl9.tHDR9dxQD4JbVuUe4tksFr6wz8qFCnkJpJl9V0wDXXX';
        return fakeToken;
      }
      return storedToken;
    }
    
    // Mode production normal
    return localStorage.getItem('client_token');
  }

  getClientRefreshToken(): string | null {
    return localStorage.getItem('client_refresh_token');
  }

  isClientLoggedIn(): boolean {
    return !!this.getClientToken();
  }

  refreshClientToken(): Observable<any> {
    const refreshToken = this.getClientRefreshToken();
    
    if (!refreshToken) {
      return throwError(() => new Error('Pas de token de rafraîchissement disponible'));
    }
    
    return this.http.post<any>('http://localhost:8000/api/token/refresh/', { refresh: refreshToken })
      .pipe(
        tap(response => {
          localStorage.setItem('client_token', response.access);
          this.clientTokenSubject.next(response.access);
          this.startRefreshTokenTimer();
        }),
        catchError(error => {
          this.logout();
          return throwError(() => error);
        })
      );
  }

  private startRefreshTokenTimer() {
    // Parse the JWT to get expiration time
    const token = this.getClientToken();
    if (!token) return;
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) throw new Error('Invalid JWT format');
      
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      const expires = new Date(tokenPayload.exp * 1000);
      const timeout = expires.getTime() - Date.now() - (60 * 1000); // Refresh 1 minute before expiry
      
      this.clearRefreshTokenTimer();
      
      if (timeout > 0) {
        this.refreshTokenTimeout = setTimeout(() => {
          this.refreshClientToken().subscribe();
        }, timeout);
      } else {
        this.refreshClientToken().subscribe();
      }
    } catch (e) {
      console.error('Erreur JWT:', e);
    }
  }

  private clearRefreshTokenTimer() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }

  redirectToShoopBord(): void {
    this.router.navigate(['/direct-shoop-bord'], { replaceUrl: true });
  }

  logout(): void {
    // Nettoyer les jetons spécifiques au client
    localStorage.removeItem(this.CLIENT_TOKEN_KEY);
    localStorage.removeItem(this.CLIENT_REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.CLIENT_USER_KEY);
    
    // Nettoyer les jetons partagés
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user_type');
    
    // Réinitialiser les états observables
    this.clientTokenSubject.next(null);
    this.clientAuthStatusSubject.next(false);
    this.clearRefreshTokenTimer();
    
    // Rediriger vers la page de connexion
    console.log('🚪 Déconnexion du client effectuée, redirection vers la page de connexion');
    this.router.navigate(['/login-client']);
  }

  isClientAuthenticated(): boolean {
    const userType = localStorage.getItem('user_type');
    const token = localStorage.getItem(this.CLIENT_TOKEN_KEY);
    
    // Vérifier d'abord le type d'utilisateur
    if (userType !== 'client') {
      return false;
    }
    
    if (!token) return false;
    
    // Vérifier si le token est au format JWT (contient deux points)
    if (!this.isValidJwtFormat(token)) {
      console.error('Token client non valide: le format JWT attendu contient deux points séparant les 3 parties');
      // Supprimer le token invalide
      localStorage.removeItem(this.CLIENT_TOKEN_KEY);
      return false;
    }
    
    // Vérifier si le token est expiré
    try {
      const isExpired = this.jwtHelper.isTokenExpired(token);
      return !isExpired;
    } catch (error) {
      console.error('Erreur lors de la vérification du token JWT client:', error);
      // Supprimer le token en cas d'erreur
      localStorage.removeItem(this.CLIENT_TOKEN_KEY);
      return false;
    }
  }
  
  getClientUserFromStorage(): any {
    const userStr = localStorage.getItem(this.CLIENT_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
} 