import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthClientService } from './auth-client.service';

export interface Category {
  id: number;
  name: string;
  description: string;
  count?: number;
  created_at?: string;
  icon?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private apiUrl = 'http://localhost:8000/api/categories/';
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$ = this.categoriesSubject.asObservable();
  
  // Données fictives en mode développement
  private mockCategories: Category[] = [
    { id: 1, name: 'Électronique', description: 'Tous les produits électroniques', count: 12 },
    { id: 2, name: 'Vêtements', description: 'Tout ce qui touche à l\'habillement', count: 28 },
    { id: 3, name: 'Maison', description: 'Produits pour la maison et décoration', count: 15 },
    { id: 4, name: 'Sport', description: 'Équipements et vêtements de sport', count: 9 },
    { id: 5, name: 'Alimentation', description: 'Produits alimentaires et boissons', count: 23 }
  ];

  constructor(
    private http: HttpClient,
    private authClientService: AuthClientService
  ) {
    // Charger les catégories au démarrage
    this.loadCategories();
  }
  
  // Méthode pour obtenir les en-têtes d'authentification
  private getAuthHeaders(): HttpHeaders {
    // En mode invité, ne pas envoyer de token d'authentification
    if (this.authClientService.isGuestMode()) {
      console.log('CategoryService - Mode invité: aucun token d\'authentification envoyé');
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

  loadCategories(): void {
    const headers = this.getAuthHeaders();
    this.http.get<Category[]>(this.apiUrl, { headers })
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement des catégories', error);
          // En mode développement, utiliser les données fictives
          this.categoriesSubject.next(this.mockCategories);
          return of([]);
        })
      )
      .subscribe(categories => {
        if (categories && categories.length > 0) {
          this.categoriesSubject.next(categories);
        }
      });
  }

  getCategories(): Observable<Category[]> {
    return this.categories$;
  }

  addCategory(category: Category): Observable<Category> {
    // Vérifier d'abord si la catégorie existe déjà par son nom
    const existingCategory = this.categoriesSubject.value.find(c => 
      c.name.toLowerCase() === category.name.toLowerCase());
    
    if (existingCategory) {
      console.warn(`Une catégorie avec le nom "${category.name}" existe déjà.`);
      return throwError(() => new Error(`Une catégorie avec le nom "${category.name}" existe déjà.`));
    }
    
    const headers = this.getAuthHeaders();
    return this.http.post<Category>(this.apiUrl, category, { headers })
      .pipe(
        tap(newCategory => {
          // Mettre à jour la liste de catégories
          const currentCategories = this.categoriesSubject.value;
          this.categoriesSubject.next([...currentCategories, newCategory]);
        }),
        catchError(error => {
          console.error('Erreur lors de l\'ajout de la catégorie', error);
          // En mode développement, simuler l'ajout
          const newId = Math.max(...this.mockCategories.map(c => c.id), 0) + 1;
          const newCategory: Category = {
            ...category,
            id: newId,
            count: 0
          };
          this.mockCategories.push(newCategory);
          
          // Mettre à jour le BehaviorSubject
          const currentCategories = this.categoriesSubject.value;
          this.categoriesSubject.next([...currentCategories, newCategory]);
          
          return of(newCategory);
        })
      );
  }

  updateCategory(category: Category): Observable<Category> {
    const headers = this.getAuthHeaders();
    return this.http.put<Category>(`${this.apiUrl}${category.id}/`, category, { headers })
      .pipe(
        tap(updatedCategory => {
          // Mettre à jour la liste de catégories
          const currentCategories = this.categoriesSubject.value;
          const index = currentCategories.findIndex(c => c.id === updatedCategory.id);
          if (index !== -1) {
            const updatedCategories = [...currentCategories];
            updatedCategories[index] = updatedCategory;
            this.categoriesSubject.next(updatedCategories);
          }
        }),
        catchError(error => {
          console.error('Erreur lors de la mise à jour de la catégorie', error);
          // En mode développement, simuler la mise à jour
          const index = this.mockCategories.findIndex(c => c.id === category.id);
          if (index !== -1) {
            this.mockCategories[index] = { ...category };
          }
          
          // Mettre à jour le BehaviorSubject
          const currentCategories = this.categoriesSubject.value;
          const catIndex = currentCategories.findIndex(c => c.id === category.id);
          if (catIndex !== -1) {
            const updatedCategories = [...currentCategories];
            updatedCategories[catIndex] = category;
            this.categoriesSubject.next(updatedCategories);
          }
          
          return of(category);
        })
      );
  }

  deleteCategory(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}${id}/`, { headers })
      .pipe(
        tap(() => {
          // Mettre à jour la liste de catégories
          const currentCategories = this.categoriesSubject.value;
          this.categoriesSubject.next(currentCategories.filter(c => c.id !== id));
        }),
        catchError(error => {
          console.error('Erreur lors de la suppression de la catégorie', error);
          // En mode développement, simuler la suppression
          this.mockCategories = this.mockCategories.filter(c => c.id !== id);
          
          // Mettre à jour le BehaviorSubject
          const currentCategories = this.categoriesSubject.value;
          this.categoriesSubject.next(currentCategories.filter(c => c.id !== id));
          
          return of(void 0);
        })
      );
  }
}
