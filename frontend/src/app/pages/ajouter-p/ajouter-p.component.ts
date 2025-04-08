import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators, AbstractControl } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { ProductService, Product } from '../../services/product.service';
import { CategoryService, Category } from '../../services/category.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ajouter-p',
  templateUrl: './ajouter-p.component.html',
  styleUrls: ['./ajouter-p.component.css'],
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    RouterModule
  ]
})
export class AjouterPComponent implements OnInit, OnDestroy {
  productForm: FormGroup;
  loading = false;
  submitted = false;
  successMessage = '';
  errorMessage = '';
  
  // Variables pour la gestion de l'image
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  uploadProgress: number = 0;
  uploadError: string | null = null;
  maxFileSize = 5 * 1024 * 1024; // 5 MB
  allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  redirectProgress: number = 0;
  redirectInterval: any;
  
  // Variables pour le mode édition
  editMode = false;
  productId: number | null = null;
  currentProduct: Product | null = null;
  
  // Variables pour les catégories
  categories: Category[] = [];
  categoriesSubscription: Subscription | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private productService: ProductService,
    private categoryService: CategoryService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.productForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      quantity: ['', [Validators.required, Validators.min(0)]],
      category: ['', Validators.required],
      status: ['available', Validators.required],
      image: [null]
    });
  }

  ngOnInit(): void {
    // Chargement des catégories
    this.loadCategories();
    
    // Vérifier si on est en mode édition
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.editMode = true;
        this.productId = +id;
        this.loadProductDetails(this.productId);
      }
    });
  }
  
  loadCategories(): void {
    this.categoriesSubscription = this.categoryService.getCategories().subscribe(
      categories => {
        this.categories = categories;
        console.log('Catégories chargées:', this.categories);
      },
      error => {
        console.error('Erreur lors du chargement des catégories', error);
        this.errorMessage = 'Erreur lors du chargement des catégories';
      }
    );
  }

  loadProductDetails(id: number) {
    this.loading = true;
    this.productService.getProductById(id).subscribe(
      product => {
        this.currentProduct = product;
        this.productForm.patchValue({
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity || 0,
          category: product.category,
          status: product.status || 'available'
        });
        
        if (product.image) {
          this.imagePreview = this.getFullImageUrl(product.image);
        }
        
        this.loading = false;
      },
      error => {
        console.error('Erreur lors du chargement du produit', error);
        this.errorMessage = 'Erreur lors du chargement du produit';
        this.loading = false;
      }
    );
  }

  getFullImageUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    
    if (path.startsWith('/')) {
      return `http://localhost:8000${path}`;
    }
    
    return `http://localhost:8000/${path}`;
  }

  get f() {
    return this.productForm.controls as {
      [key: string]: AbstractControl;
    };
  }

  onFileSelected(event: any) {
    this.uploadError = null;
    const file = event.target.files[0];
    
    if (!file) {
      return;
    }
    
    // Vérification du type de fichier
    if (!this.allowedTypes.includes(file.type)) {
      this.uploadError = "Format de fichier non supporté. Utilisez JPG, PNG, GIF ou WEBP.";
      return;
    }
    
    // Vérification de la taille du fichier
    if (file.size > this.maxFileSize) {
      this.uploadError = `Le fichier est trop volumineux. La taille maximale est de ${this.maxFileSize / (1024 * 1024)} MB.`;
      return;
    }
    
    this.selectedFile = file;
    
    // Prévisualisation de l'image
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result;
    };
    reader.readAsDataURL(file);
    
    // Mise à jour du formulaire
    this.productForm.patchValue({
      image: file
    });
  }

  removeImage() {
    this.selectedFile = null;
    this.imagePreview = null;
    this.uploadProgress = 0;
    this.uploadError = null;
    this.productForm.patchValue({
      image: null
    });
  }

  resetForm() {
    this.productForm.reset();
    this.removeImage();
    this.submitted = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    // Vérifier la validité du formulaire
    if (this.productForm.invalid) {
      console.log('Formulaire invalide');
      return;
    }
    
    this.loading = true;
    console.log('Soumission du formulaire en cours...');
    
    // Créer l'objet FormData
    const formData = new FormData();
    
    // Ajouter les champs du formulaire
    Object.keys(this.productForm.controls).forEach(key => {
      if (key !== 'image' && this.productForm.get(key)?.value !== null && this.productForm.get(key)?.value !== undefined) {
        formData.append(key, this.productForm.get(key)?.value);
      }
    });
    
    console.log('Données du formulaire préparées');
    
    // Ajouter l'image si une nouvelle a été sélectionnée
    if (this.selectedFile) {
      formData.append('image', this.selectedFile, this.selectedFile.name);
      console.log('Image ajoutée au formulaire:', this.selectedFile.name);
    }
    
    // Mode édition ou création
    if (this.editMode && this.productId) {
      console.log(`Mode édition: mise à jour du produit ID ${this.productId}`);
      
      this.productService.updateProduct(this.productId, formData)
        .subscribe({
          next: (event) => this.handleUploadResponse(event),
          error: (error) => this.handleError(error)
        });
    } else {
      console.log('Mode création: ajout d\'un nouveau produit');
      
      this.productService.createProduct(formData)
        .subscribe({
          next: (event) => this.handleUploadResponse(event),
          error: (error) => this.handleError(error)
        });
    }
  }

  handleUploadResponse(event: any): void {
    if (event.type === HttpEventType.UploadProgress) {
      // Calculer le pourcentage de progression
      this.uploadProgress = Math.round(100 * event.loaded / (event.total || 1));
      console.log(`Progression: ${this.uploadProgress}%`);
    } else if (event.type === HttpEventType.Response) {
      // Réponse finale du serveur
      this.uploadProgress = 100;
      this.loading = false;
      this.successMessage = this.editMode ? 
        'Produit mis à jour avec succès!' : 
        'Produit ajouté avec succès!';
      
      console.log('Réponse du serveur:', event.body);
      
      // Redirection après 2 secondes
      this.startRedirectCountdown();
    }
  }

  handleError(error: any): void {
    this.loading = false;
    this.uploadProgress = 0;
    console.error('Erreur lors de l\'opération:', error);
    
    if (error.status === 400) {
      // Erreurs de validation
      let errorMessage = 'Le formulaire contient des erreurs:';
      if (error.error) {
        Object.keys(error.error).forEach(key => {
          errorMessage += `\n- ${key}: ${error.error[key]}`;
        });
      }
      this.errorMessage = errorMessage;
    } else if (error.status === 403) {
      this.errorMessage = 'Vous n\'avez pas les permissions nécessaires pour effectuer cette action.';
    } else {
      this.errorMessage = 'Une erreur est survenue. Veuillez réessayer plus tard.';
    }
  }

  startRedirectCountdown(): void {
    this.redirectProgress = 0;
    this.redirectInterval = setInterval(() => {
      this.redirectProgress += 2;
      if (this.redirectProgress >= 100) {
        clearInterval(this.redirectInterval);
        this.router.navigate(['/produits']);
      }
    }, 40); // ~2 secondes au total
  }

  ngOnDestroy(): void {
    if (this.redirectInterval) {
      clearInterval(this.redirectInterval);
    }
    
    if (this.categoriesSubscription) {
      this.categoriesSubscription.unsubscribe();
    }
  }
} 