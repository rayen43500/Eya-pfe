import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, switchMap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'client' | 'livreur';
  first_name?: string;
  last_name?: string;
  phone?: string;
  profile_image?: string;
  addresses?: UserAddress[];
  created_at?: string;
  last_login?: string;
}

export interface UserAddress {
  id?: number;
  full_name: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  phone: string;
  is_default?: boolean;
}

export interface AuthResponse {
  user: User;
  access: string;
  refresh: string;
}

export interface RefreshResponse {
  access: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8000/accounts/api/';
  private tokenUrl = 'http://localhost:8000/api/token/';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject.asObservable();
  
  private accessTokenSubject = new BehaviorSubject<string | null>(null);
  public accessToken = this.accessTokenSubject.asObservable();
  
  private refreshInProgress = false;
  private refreshTokenTimeout: any;

  constructor(private http: HttpClient, private router: Router) {
    // Load user and tokens from localStorage on service initialization
    this.loadStoredAuth();
    console.log('AuthService initialized, checking stored credentials');
  }

  private loadStoredAuth() {
    const user = localStorage.getItem('currentUser');
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (user && token) {
      console.log('Found stored user and token, initializing auth state');
      try {
        const userObj = JSON.parse(user);
        this.currentUserSubject.next(userObj);
        this.accessTokenSubject.next(token);
        
        // Log the details for debugging
        console.log(`User loaded from storage: ${userObj.username}, role: ${userObj.role}`);
        console.log(`Token available: ${!!token}, refresh token available: ${!!refreshToken}`);
        
        // Start token refresh timer if we have a refresh token
        if (refreshToken) {
          this.startRefreshTokenTimer();
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        // Clear invalid data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
    } else {
      console.log('No stored auth credentials found');
    }
  }

  // Generic login (can be used by any user type)
  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}login/`, { username, password })
      .pipe(
        tap(response => this.handleAuthResponse(response)),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }
  
  // Role-specific login methods
  clientLogin(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`http://localhost:8000/accounts/api/login/client/`, { username, password })
      .pipe(
        tap(response => this.handleAuthResponse(response)),
        catchError(error => {
          console.error('Client login error:', error);
          return throwError(() => error);
        })
      );
  }
  
  adminLogin(username: string, password: string): Observable<AuthResponse> {
    console.log(`👤 Tentative de connexion admin avec nom d'utilisateur: ${username}`);
    
    // 1. Nettoyer d'abord toutes les données d'authentification existantes
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
      username: username,
      password: password
    };
    
    console.log('📦 Données envoyées:', JSON.stringify(loginData));
    
    // 3. Assurons-nous de ne pas utiliser d'intercepteur pour les requêtes d'authentification
    return this.http.post<AuthResponse>(`http://localhost:8000/accounts/api/login/admin/`, loginData)
      .pipe(
        tap(response => {
          console.log('🟢 Connexion admin réussie:', response);
          console.log('👤 Rôle de l\'utilisateur:', response.user.role);
          this.handleAuthResponse(response);
        }),
        catchError(error => {
          console.error('🛑 Erreur de connexion admin:', error);
          console.error('📄 Détails de l\'erreur:', error.error);
          return throwError(() => error);
        })
      );
  }
  
  livreurLogin(username: string, password: string): Observable<AuthResponse> {
    console.log(`👤 Tentative de connexion livreur avec nom d'utilisateur: ${username}`);
    
    // 1. Nettoyer d'abord toutes les données d'authentification existantes
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
      username: username,
      password: password
    };
    
    console.log('📦 Données envoyées:', JSON.stringify(loginData));
    
    // 3. Assurons-nous de ne pas utiliser d'intercepteur pour les requêtes d'authentification
    return this.http.post<AuthResponse>(`http://localhost:8000/accounts/api/login/livreur/`, loginData)
      .pipe(
        tap(response => {
          console.log('🟢 Connexion livreur réussie:', response);
          console.log('👤 Rôle de l\'utilisateur:', response.user.role);
          this.handleAuthResponse(response);
        }),
        catchError(error => {
          console.error('🛑 Erreur de connexion livreur:', error);
          console.error('📄 Détails de l\'erreur:', error.error);
          return throwError(() => error);
        })
      );
  }

  // Handle successful authentication response
  private handleAuthResponse(response: AuthResponse) {
    // Store tokens and user info
    localStorage.setItem('access_token', response.access);
    localStorage.setItem('refresh_token', response.refresh);
    localStorage.setItem('currentUser', JSON.stringify(response.user));
    
    // Update subjects
    this.currentUserSubject.next(response.user);
    this.accessTokenSubject.next(response.access);
    
    // Start token refresh timer
    this.startRefreshTokenTimer();
    
    // Enregistrer explicitement le type d'utilisateur
    const userRole = response.user.role;
    console.log(`👤 Authentification réussie - rôle détecté: ${userRole}`);
    localStorage.setItem('user_type', userRole);
    
    // Rediriger l'utilisateur en fonction de son rôle immédiatement
    console.log(`🚀 Redirection après connexion pour rôle: ${userRole}`);
    
    if (userRole === 'admin') {
      // Redirection admin vers le dashboard
      console.log('👉 Redirection vers le dashboard admin');
      this.redirectToDashboard();
    } else if (userRole === 'client') {
      // Redirection client vers l'espace client
      console.log('👉 Redirection vers l\'espace client');
      this.redirectToClientHome();
    } else if (userRole === 'livreur') {
      // Redirection livreur vers le dashboard livreur
      console.log('👉 Redirection vers le dashboard livreur');
      this.redirectToLivreurDashboard();
    } else {
      console.warn(`⚠️ Rôle non reconnu: ${userRole}, redirection par défaut`);
      this.router.navigate(['/']);
    }
  }
  
  // Méthodes de redirection spécifiques aux rôles
  redirectToDashboard(): void {
    console.log('✈️ Redirection directe vers le dashboard admin');
    window.location.href = '/admin-dashboard';
  }
  
  redirectToClientHome(): void {
    console.log('✈️ Redirection directe vers l\'espace client');
    window.location.href = '/direct-shoop-bord';
  }
  
  redirectToLivreurDashboard(): void {
    console.log('✈️ Redirection directe vers le dashboard livreur');
    window.location.href = '/livreur-dashboard';
  }
  
  // Refresh the access token using the refresh token
  refreshToken(): Observable<RefreshResponse | null> {
    if (this.refreshInProgress) {
      return of(null);
    }
    
    const refreshToken = this.getRefreshToken();
    
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }
    
    this.refreshInProgress = true;
    
    return this.http.post<RefreshResponse>(`${this.tokenUrl}refresh/`, { refresh: refreshToken })
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access);
          this.accessTokenSubject.next(response.access);
          this.refreshInProgress = false;
          this.startRefreshTokenTimer();
        }),
        catchError(error => {
          this.refreshInProgress = false;
          this.logout();
          console.error('Token refresh error:', error);
          return throwError(() => error);
        })
      );
  }
  
  private startRefreshTokenTimer() {
    // Parse the JWT to get expiration time
    const jwtToken = this.getAccessToken();
    if (!jwtToken) return;
    
    try {
      const tokenParts = jwtToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid JWT format');
      }
      
      const tokenPayload = JSON.parse(atob(tokenParts[1]));
      const expiresAt = new Date(tokenPayload.exp * 1000);
      const now = new Date();
      
      // Calculate time to refresh (60 seconds before expiration)
      const timeout = expiresAt.getTime() - now.getTime() - (60 * 1000);
      
      // Clear any existing timer
      this.clearRefreshTokenTimer();
      
      // Set new timer
      if (timeout > 0) {
        this.refreshTokenTimeout = setTimeout(() => {
          this.refreshToken().subscribe();
        }, timeout);
      } else {
        // If token already expired, refresh now
        this.refreshToken().subscribe();
      }
    } catch (e) {
      console.error('Error parsing JWT token:', e);
    }
  }
  
  private clearRefreshTokenTimer() {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
    }
  }
  
  // Get stored tokens
  getAccessToken(): string | null {
    // Mode développement - pour faciliter le test sans authentification
    const isDevMode = true;  // Activé pour le développement
    
    if (isDevMode) {
      // En mode développement, générer un token factice si aucun n'est présent
      const storedToken = localStorage.getItem('access_token');
      if (!storedToken) {
        console.log('Mode développement: génération d\'un token factice pour admin');
        // Token avec plus de droits pour l'administration
        const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIFVzZXIiLCJlbWFpbCI6ImFkbWluQGV4YW1wbGUuY29tIiwiaWQiOjEsInJvbGUiOiJhZG1pbiIsImlzX3N0YWZmIjp0cnVlLCJpc19zdXBlcnVzZXIiOnRydWUsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjo5OTk5OTk5OTk5fQ.CUEynk6nKU7fzbgoTYeGja-JdkF_gB6HbQQbZmBsQHk';
        
        // Enregistrer le token dans le localStorage pour les futurs appels
        localStorage.setItem('access_token', fakeToken);
        localStorage.setItem('user_type', 'admin');
        
        // Sauvegarder un utilisateur factice
        const fakeUser: User = {
          id: 1,
          username: 'admin',
          email: 'admin@example.com',
          role: 'admin',
          first_name: 'Admin',
          last_name: 'User'
        };
        localStorage.setItem('currentUser', JSON.stringify(fakeUser));
        this.currentUserSubject.next(fakeUser);
        
        return fakeToken;
      }
      return storedToken;
    }
    
    // Mode production normal
    return localStorage.getItem('access_token');
  }
  
  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    console.log('Vérification token d\'accès:', token ? `Token présent: ${token.substring(0, 15)}...` : 'Aucun token');
    return !!token;
  }
  
  // Check user roles
  isAdmin(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.role === 'admin';
  }
  
  isClient(): boolean {
    const user = this.currentUserSubject.value;
    return user?.role === 'client';
  }
  
  isLivreur(): boolean {
    const user = this.currentUserSubject.value;
    return !!user && user.role === 'livreur';
  }

  // Logout user
  logout(): void {
    // Save the role before clearing storage
    const user = this.currentUserSubject.value;
    const role = user?.role;
    
    // Clear auth data
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user_type');
    this.accessTokenSubject.next(null);
    this.currentUserSubject.next(null);
    this.clearRefreshTokenTimer();
    
    // Navigate to the appropriate login page based on role
    console.log(`Déconnexion - redirection basée sur le rôle: ${role || 'inconnu'}`);
    if (role === 'admin') {
      this.router.navigate(['/login']);
    } else if (role === 'client') {
      this.router.navigate(['/login-client']);
    } else if (role === 'livreur') {
      this.router.navigate(['/login-livreur']);
    } else {
      // Fallback to general login
      this.router.navigate(['/login-client']);
    }
  }
  
  // Method to handle HTTP errors with token refresh attempt
  handleError = (error: HttpErrorResponse): Observable<any> => {
    if (error.status === 401 && !error.url?.includes('token/refresh')) {
      // Try to refresh the token for 401 errors
      return this.refreshToken().pipe(
        switchMap(() => {
          // If token refresh is successful, retry the original request
          return throwError(() => new Error('Token refreshed - retry request'));
        }),
        catchError(() => {
          // If refresh fails, logout and proceed with the original error
          this.logout();
          return throwError(() => error);
        })
      );
    }
    
    // For other errors, simply pass them through
    return throwError(() => error);
  }

  // Méthodes de gestion de profil utilisateur
  getUserProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}profile/`)
      .pipe(
        tap(user => {
          // Mettre à jour le currentUser avec les informations de profil complémentaires
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const updatedUser = { ...currentUser, ...user };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la récupération du profil:', error);
          return throwError(() => error);
        })
      );
  }

  updateProfile(profileData: Partial<User>): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}profile/update/`, profileData)
      .pipe(
        tap(updatedUser => {
          // Mettre à jour le currentUser avec les informations mises à jour
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const newUser = { ...currentUser, ...updatedUser };
            this.currentUserSubject.next(newUser);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la mise à jour du profil:', error);
          return throwError(() => error);
        })
      );
  }

  updateProfilePicture(file: File): Observable<User> {
    const formData = new FormData();
    formData.append('profile_image', file);
    
    return this.http.post<User>(`${this.apiUrl}profile/upload-image/`, formData)
      .pipe(
        tap(response => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser && response.profile_image) {
            const updatedUser = { ...currentUser, profile_image: response.profile_image };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors du téléchargement de l\'image de profil:', error);
          return throwError(() => error);
        })
      );
  }

  // Gestion des adresses utilisateur
  getUserAddresses(): Observable<UserAddress[]> {
    return this.http.get<UserAddress[]>(`${this.apiUrl}addresses/`)
      .pipe(
        tap(addresses => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const updatedUser = { ...currentUser, addresses };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la récupération des adresses:', error);
          return throwError(() => error);
        })
      );
  }

  addAddress(address: UserAddress): Observable<UserAddress> {
    return this.http.post<UserAddress>(`${this.apiUrl}addresses/`, address)
      .pipe(
        tap(newAddress => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser) {
            const addresses = currentUser.addresses ? [...currentUser.addresses, newAddress] : [newAddress];
            const updatedUser = { ...currentUser, addresses };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de l\'ajout d\'une adresse:', error);
          return throwError(() => error);
        })
      );
  }

  updateAddress(addressId: number, addressData: UserAddress): Observable<UserAddress> {
    return this.http.put<UserAddress>(`${this.apiUrl}addresses/${addressId}/`, addressData)
      .pipe(
        tap(updatedAddress => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser && currentUser.addresses) {
            const updatedAddresses = currentUser.addresses.map(addr => 
              addr.id === addressId ? updatedAddress : addr
            );
            const updatedUser = { ...currentUser, addresses: updatedAddresses };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la mise à jour de l\'adresse:', error);
          return throwError(() => error);
        })
      );
  }

  deleteAddress(addressId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}addresses/${addressId}/`)
      .pipe(
        tap(() => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser && currentUser.addresses) {
            const updatedAddresses = currentUser.addresses.filter(addr => addr.id !== addressId);
            const updatedUser = { ...currentUser, addresses: updatedAddresses };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la suppression de l\'adresse:', error);
          return throwError(() => error);
        })
      );
  }

  setDefaultAddress(addressId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}addresses/${addressId}/set-default/`, {})
      .pipe(
        tap(() => {
          const currentUser = this.currentUserSubject.value;
          if (currentUser && currentUser.addresses) {
            const updatedAddresses = currentUser.addresses.map(addr => ({
              ...addr,
              is_default: addr.id === addressId
            }));
            const updatedUser = { ...currentUser, addresses: updatedAddresses };
            this.currentUserSubject.next(updatedUser);
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la définition de l\'adresse par défaut:', error);
          return throwError(() => error);
        })
      );
  }

  // Méthode pour changer le mot de passe
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}change-password/`, {
      old_password: oldPassword,
      new_password: newPassword
    }).pipe(
      catchError(error => {
        console.error('Erreur lors du changement de mot de passe:', error);
    return throwError(() => error);
      })
    );
  }

  // Client registration method
  registerClient(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}register/client/`, data).pipe(
      catchError(this.handleError)
    );
  }
  
  // Livreur registration method
  registerLivreur(data: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}register/livreur/`, data).pipe(
      catchError(this.handleError)
    );
  }
} 