import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { CategoryService, Category } from '../../services/category.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule
  ],
  templateUrl: './categories.component.html',
  styleUrl: './categories.component.css'
})
export class CategoriesComponent implements OnInit {
  categories: Category[] = [];
  loading = false;
  error = '';
  newCategory: Category = {
    id: 0,
    name: '',
    description: ''
  };
  editingCategory: Category | null = null;
  
  constructor(
    private categoryService: CategoryService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.fetchCategories();
  }
  
  fetchCategories(): void {
    this.loading = true;
    this.categoryService.getCategories().subscribe(
      categories => {
        this.categories = categories;
        this.loading = false;
      }
    );
  }
  
  addCategory(): void {
    if (!this.newCategory.name) {
      this.error = 'Le nom de la catégorie est requis';
      return;
    }
    
    this.loading = true;
    this.categoryService.addCategory(this.newCategory).subscribe({
      next: () => {
        this.newCategory = { id: 0, name: '', description: '' };
        this.loading = false;
        this.error = '';
        this.showNotification('Catégorie ajoutée avec succès', 'success');
      },
      error: (err) => {
        console.error('Erreur lors de l\'ajout de la catégorie', err);
        if (err.message && err.message.includes('existe déjà')) {
          this.error = err.message;
        } else {
          this.error = 'Impossible d\'ajouter la catégorie. Veuillez réessayer plus tard.';
        }
        this.loading = false;
        this.showNotification(this.error, 'error');
      }
    });
  }
  
  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    const notification = document.createElement('div');
    notification.className = `notification ${type}-notification`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
  
  startEditing(category: Category): void {
    this.editingCategory = { ...category };
  }
  
  cancelEditing(): void {
    this.editingCategory = null;
  }
  
  updateCategory(): void {
    if (!this.editingCategory) return;
    
    this.loading = true;
    this.categoryService.updateCategory(this.editingCategory).subscribe({
      next: () => {
        this.editingCategory = null;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour de la catégorie', err);
        this.error = 'Impossible de mettre à jour la catégorie. Veuillez réessayer plus tard.';
        this.loading = false;
      }
    });
  }
  
  deleteCategory(id: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) {
      return;
    }
    
    this.loading = true;
    this.categoryService.deleteCategory(id).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors de la suppression de la catégorie', err);
        this.error = 'Impossible de supprimer la catégorie. Veuillez réessayer plus tard.';
        this.loading = false;
      }
    });
  }
  
  goBack(): void {
    this.router.navigate(['/admin-dashboard']);
  }
}
