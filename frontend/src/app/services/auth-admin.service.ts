import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({
  providedIn: 'root'
})
export class AuthAdminService {
  private readonly ADMIN_TOKEN_KEY = 'admin_token';
  private readonly ADMIN_REFRESH_TOKEN_KEY = 'admin_refresh_token';
  private readonly ADMIN_USER_KEY = 'admin_user';
  private jwtHelper = new JwtHelperService();
  
  private adminAuthStatusSubject = new BehaviorSubject<boolean>(this.isAdminAuthenticated());
  public adminAuthStatus$ = this.adminAuthStatusSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    // Vérifier et nettoyer les conflits de token au démarrage
    this.cleanAuthConflicts();
  }

  // Nettoyer les conflits d'authentification entre admin et client
  cleanAuthConflicts(): void {
    const userType = localStorage.getItem('user_type');
    const adminToken = localStorage.getItem('admin_token');
    const clientToken = localStorage.getItem('client_token');
    
    console.log('🔍 Vérification des tokens admin au démarrage');
    
    // Si l'utilisateur est marqué comme admin mais n'a pas de token admin valide
    if (userType === 'admin' && (!adminToken || !this.isValidJwtFormat(adminToken))) {
      console.log('🔄 Nettoyage des tokens admin invalides');
      
      // Si c'est un conflit avec un token client, définir l'utilisateur comme client
      if (clientToken && this.isValidJwtFormat(clientToken)) {
        console.log('⚠️ Conflit détecté: token client présent avec type utilisateur admin');
        localStorage.setItem('user_type', 'client');
      } else {
        // Si pas de token client valide non plus, réinitialiser complètement
        console.log('🧹 Aucun token valide trouvé, nettoyage complet');
        this.clearAllTokens();
      }
    }
  }
  
  // Vérifier si une chaîne est au format JWT valide (a.b.c)
  private isValidJwtFormat(token: string): boolean {
    if (!token) return false;
    return token.split('.').length === 3;
  }
  
  // Supprimer tous les tokens d'authentification
  private clearAllTokens(): void {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('admin_user');
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_refresh_token');
    localStorage.removeItem('client_user');
    localStorage.removeItem('user_type');
  }

  loginAdmin(credentials: any): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post('http://localhost:8000/accounts/api/login/admin/', credentials, { headers })
      .pipe(
        tap((response: any) => {
          console.log('Admin login response:', response);
          
          // Vérifier si la réponse contient un token
          if (response && response.access) {
            console.log('JWT Token reçu du serveur, stockage dans localStorage.');
            // Stocker les tokens dans localStorage
            localStorage.setItem(this.ADMIN_TOKEN_KEY, response.access);
            if (response.refresh) {
              localStorage.setItem(this.ADMIN_REFRESH_TOKEN_KEY, response.refresh);
            }
            
            // Décoder et stocker les informations utilisateur
            const decodedToken = this.jwtHelper.decodeToken(response.access);
            if (decodedToken) {
              localStorage.setItem(this.ADMIN_USER_KEY, JSON.stringify(decodedToken));
              console.log('Informations utilisateur extraites du token JWT:', decodedToken);
            }
            
            // Définir le type d'utilisateur
            localStorage.setItem('user_type', 'admin');
            
            // Mettre à jour le statut d'authentification
            this.adminAuthStatusSubject.next(true);
          } else {
            console.error('Erreur: Aucun token JWT reçu dans la réponse du serveur', response);
          }
        }),
        catchError(error => {
          console.error('Erreur de connexion admin:', error);
          return throwError(() => error);
        })
      );
  }

  // Rafraîchir le token d'accès avec le refresh token
  refreshAdminToken(): Observable<any> {
    const refreshToken = localStorage.getItem(this.ADMIN_REFRESH_TOKEN_KEY);
    
    if (!refreshToken) {
      console.error('Impossible de rafraîchir le token admin : refresh token manquant');
      return throwError(() => new Error('Refresh token missing'));
    }
    
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    console.log('Tentative de rafraîchissement du token admin');
    
    return this.http.post('http://localhost:8000/api/token/refresh/', 
      { refresh: refreshToken }, 
      { headers }
    ).pipe(
      tap((response: any) => {
        if (response && response.access) {
          localStorage.setItem(this.ADMIN_TOKEN_KEY, response.access);
          console.log('Token d\'accès admin rafraîchi avec succès');
          this.adminAuthStatusSubject.next(true);
        }
      }),
      catchError(error => {
        console.error('Erreur lors du rafraîchissement du token admin:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  isAdminAuthenticated(): boolean {
    const userType = localStorage.getItem('user_type');
    const token = localStorage.getItem('admin_token');
    
    // Vérifier d'abord le type d'utilisateur
    if (userType !== 'admin') {
      return false;
    }
    
    if (!token) return false;
    
    // Vérifier si le token est au format JWT valide
    if (!this.isValidJwtFormat(token)) {
      console.error('Token admin non valide: le format JWT attendu est composé de 3 parties séparées par des points');
      // Supprimer le token invalide
      localStorage.removeItem('admin_token');
      return false;
    }
    
    // Vérifier si le token est expiré
    try {
      const isExpired = this.jwtHelper.isTokenExpired(token);
      return !isExpired;
    } catch (error) {
      console.error('Erreur lors de la vérification du token JWT admin:', error);
      // Supprimer le token en cas d'erreur
      localStorage.removeItem('admin_token');
      return false;
    }
  }

  getAdminToken(): string | null {
    const token = localStorage.getItem('admin_token');
    
    // Vérifier si le token existe et est au format JWT valide
    if (!token || !this.isValidJwtFormat(token)) {
      console.error('Tentative d\'accès à un token admin invalide ou inexistant');
      // Nettoyer le token invalide si présent
      if (token) localStorage.removeItem('admin_token');
      return null;
    }
    
    return token;
  }

  logout(): void {
    localStorage.removeItem(this.ADMIN_TOKEN_KEY);
    localStorage.removeItem(this.ADMIN_REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.ADMIN_USER_KEY);
    localStorage.removeItem('user_type');
    this.adminAuthStatusSubject.next(false);
    this.router.navigate(['/login']);
  }
  
  getAdminUserFromStorage(): any {
    const userStr = localStorage.getItem(this.ADMIN_USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }
  
  // Méthode pour rediriger après login
  redirectToDashboard(): void {
    console.log('🚀 Redirection admin vers dashboard');
    this.router.navigate(['/dashboard'], { replaceUrl: true });
  }
} 