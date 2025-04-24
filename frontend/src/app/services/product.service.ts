import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { CategoryService } from './category.service';
import { AuthClientService } from './auth-client.service';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  final_price?: number;
  category: string;
  category_info?: {
    id: number;
    name: string;
    icon: string;
  };
  image?: string;
  stock: number;
  quantity?: number;
  status?: string;
  rating?: number;
  discount_percentage?: number;
  is_on_promotion?: boolean;
  created_at?: string;
  updated_at?: string;
  has_discount?: boolean;
  is_available?: boolean;
}

export interface Category {
  id: number;
  name: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private apiUrl = 'http://localhost:8000/api/products/';
  private categoriesUrl = 'http://localhost:8000/api/categories/';

  constructor(
    private http: HttpClient,
    private categoryService: CategoryService,
    private authClientService: AuthClientService
  ) { }

  // Méthode pour obtenir les en-têtes d'authentification
  private getAuthHeaders(): HttpHeaders {
    // En mode invité, ne pas envoyer de token d'authentification
    if (this.authClientService.isGuestMode()) {
      console.log('ProductService - Mode invité: aucun token d\'authentification envoyé');
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }
    
    // Mode authentifié, envoyer le token
    const token = this.authClientService.getClientToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Méthode améliorée pour créer un produit
  createProduct(productData: FormData): Observable<HttpEvent<any>> {
    // Vérifier si la catégorie existe, sinon créer une nouvelle catégorie
    this.ensureCategoryExists(productData.get('category') as string);
    
    // Pas besoin d'ajouter les en-têtes d'authentification à FormData
    // car il s'agit d'un type différent de requête multipart/form-data
    let headers = new HttpHeaders();
    
    // En mode invité, ne pas envoyer de token d'authentification
    if (!this.authClientService.isGuestMode()) {
      const token = this.authClientService.getClientToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return this.http.post<any>(this.apiUrl, productData, {
      headers,
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode pour mettre à jour un produit
  updateProduct(id: number, productData: FormData): Observable<HttpEvent<any>> {
    // Vérifier si la catégorie existe, sinon créer une nouvelle catégorie
    this.ensureCategoryExists(productData.get('category') as string);
    
    // Pas besoin d'ajouter les en-têtes d'authentification à FormData
    // car il s'agit d'un type différent de requête multipart/form-data
    let headers = new HttpHeaders();
    
    // En mode invité, ne pas envoyer de token d'authentification
    if (!this.authClientService.isGuestMode()) {
      const token = this.authClientService.getClientToken();
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return this.http.put<any>(`${this.apiUrl}${id}/`, productData, {
      headers,
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode pour s'assurer qu'une catégorie existe
  private ensureCategoryExists(categoryName: string): void {
    if (!categoryName) return;
    
    // Vérifier si la catégorie existe déjà
    this.categoryService.getCategories().subscribe(categories => {
      const categoryExists = categories.some(cat => cat.name === categoryName);
      
      // Si la catégorie n'existe pas encore, la créer
      if (!categoryExists) {
        console.log(`Création d'une nouvelle catégorie: ${categoryName}`);
        this.categoryService.addCategory({
          id: 0,
          name: categoryName,
          description: `Catégorie créée automatiquement pour ${categoryName}`
        }).subscribe(
          newCategory => console.log('Nouvelle catégorie créée:', newCategory),
          error => console.error('Erreur lors de la création de la catégorie:', error)
        );
      }
    });
  }

  // Méthode pour obtenir tous les produits
  getProducts(): Observable<Product[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Product[]>(this.apiUrl, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode pour obtenir un produit par son ID
  getProductById(id: number): Observable<Product> {
    const headers = this.getAuthHeaders();
    return this.http.get<Product>(`${this.apiUrl}${id}/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthode pour supprimer un produit
  deleteProduct(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.apiUrl}${id}/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  // Méthodes pour les catégories
  getCategories(): Observable<Category[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Category[]>(this.categoriesUrl, { headers }).pipe(
      tap(categories => console.log('Catégories chargées:', categories.length)),
      catchError(this.handleError)
    );
  }

  getCategoryById(id: number): Observable<Category> {
    const headers = this.getAuthHeaders();
    return this.http.get<Category>(`${this.categoriesUrl}${id}/`, { headers }).pipe(
      catchError(this.handleError)
    );
  }

  addCategory(category: { name: string, description: string }): Observable<Category> {
    const headers = this.getAuthHeaders();
    return this.http.post<Category>(this.categoriesUrl, category, { headers }).pipe(
      tap(newCategory => console.log('Catégorie ajoutée:', newCategory.name)),
      catchError(this.handleError)
    );
  }

  updateCategory(id: number, category: { name: string, description: string }): Observable<Category> {
    const headers = this.getAuthHeaders();
    return this.http.put<Category>(`${this.categoriesUrl}${id}/`, category, { headers }).pipe(
      tap(updatedCategory => console.log('Catégorie mise à jour:', updatedCategory.name)),
      catchError(this.handleError)
    );
  }

  deleteCategory(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.delete(`${this.categoriesUrl}${id}/`, { headers }).pipe(
      tap(() => console.log('Catégorie supprimée, id:', id)),
      catchError(this.handleError)
    );
  }

  // Gestionnaire d'erreur
  private handleError(error: any) {
    console.error('Une erreur s\'est produite', error);
    return throwError(() => error);
  }
} 