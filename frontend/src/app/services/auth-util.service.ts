import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthUtilService {

  constructor(private router: Router) {}

  /**
   * Nettoie complètement tous les tokens et données d'authentification
   * Utile en cas de problèmes d'authentification
   */
  clearAllAuthData(): void {
    console.log('🧹 Nettoyage complet des données d\'authentification');
    
    // Effacer tous les tokens possibles
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    localStorage.removeItem('client_token');
    localStorage.removeItem('client_refresh_token');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user_type');
    
    // Effacer les cookies de session (optionnel)
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=');
      document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
    
    console.log('✅ Nettoyage terminé - Redirection vers la page d\'accueil');
    
    // Rediriger vers la page d'accueil
    this.router.navigate(['/']);
  }

  /**
   * Vérifie et corrige les incohérences dans les tokens stockés
   * Par exemple, si user_type est 'livreur' mais qu'il n'y a pas de token livreur
   */
  fixAuthInconsistencies(): void {
    const userType = localStorage.getItem('user_type');
    const accessToken = localStorage.getItem('access_token');
    const clientToken = localStorage.getItem('client_token');
    const adminToken = localStorage.getItem('admin_token');
    
    console.log(`🔍 Vérification des incohérences - Type utilisateur: ${userType || 'aucun'}`);
    
    let inconsistencyFound = false;
    
    // Cas où user_type est défini mais le token correspondant est absent
    if (userType === 'client' && !clientToken) {
      console.warn('⚠️ Type utilisateur client mais pas de token client');
      inconsistencyFound = true;
    } else if (userType === 'admin' && !adminToken) {
      console.warn('⚠️ Type utilisateur admin mais pas de token admin');
      inconsistencyFound = true;
    } else if (userType === 'livreur' && !accessToken) {
      console.warn('⚠️ Type utilisateur livreur mais pas de token livreur');
      inconsistencyFound = true;
    }
    
    // Si aucun user_type n'est défini mais qu'il y a des tokens
    if (!userType && (accessToken || clientToken || adminToken)) {
      console.warn('⚠️ Tokens présents mais aucun type utilisateur défini');
      inconsistencyFound = true;
    }
    
    // Nettoyer si des incohérences sont détectées
    if (inconsistencyFound) {
      console.log('🧹 Correction des incohérences - Nettoyage des données d\'authentification');
      this.clearAllAuthData();
    } else {
      console.log('✅ Aucune incohérence détectée');
    }
  }
} 