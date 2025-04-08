import { Component, OnInit } from '@angular/core';
import { UserService, User, UserCreate } from '../../services/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-utilisateurs',
  standalone: false,
  templateUrl: './utilisateurs.component.html',
  styleUrl: './utilisateurs.component.css'
})
export class UtilisateursComponent implements OnInit {
  users: User[] = [];
  selectedUser: User | null = null;
  userForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  showModal = false;
  isEditing = false;
  roleOptions = [
    { value: 'admin', label: 'Administrateur' },
    { value: 'client', label: 'Client' },
    { value: 'livreur', label: 'Livreur' }
  ];
  
  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(4)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      password2: ['', [Validators.required]],
      first_name: [''],
      last_name: [''],
      is_active: [true],
      is_staff: [false],
      role: ['client', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  // Validateur pour s'assurer que les mots de passe correspondent
  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const password2 = form.get('password2');
    
    if (password && password2 && password.value !== password2.value) {
      password2.setErrors({ mismatch: true });
    } else if (password2) {
      // Effacer l'erreur si les mots de passe correspondent
      const errors = { ...password2.errors };
      if (errors) {
        delete errors['mismatch'];
        password2.setErrors(Object.keys(errors).length > 0 ? errors : null);
      }
    }
    
    return null;
  }

  loadUsers(): void {
    this.loading = true;
    console.log('Chargement des utilisateurs...');
    
    this.userService.getUsers().subscribe(
      (data) => {
        console.log('Données reçues:', data);
        this.users = data;
        this.loading = false;
      },
      (error) => this.handleError('chargement des utilisateurs', error)
    );
  }

  openModal(user?: User): void {
    this.isEditing = !!user;
    this.selectedUser = user || null;
    
    // Réinitialiser le formulaire et définir les valeurs par défaut
    this.userForm.reset({
      is_active: true,
      is_staff: false,
      role: 'client'
    });
    
    if (user) {
      // Remplir le formulaire avec les données de l'utilisateur sélectionné
      // En mode édition, le mot de passe est facultatif
      this.userForm.patchValue({
        username: user.username,
        email: user.email,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        is_active: user.is_active,
        is_staff: user.is_staff,
        role: user.role
      });
      
      // Ne pas exiger de mot de passe en mode édition
      this.userForm.get('password')?.setValidators(null);
      this.userForm.get('password2')?.setValidators(null);
    } else {
      // Exiger un mot de passe en mode création
      this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(8)]);
      this.userForm.get('password2')?.setValidators([Validators.required]);
    }
    
    // Mettre à jour les validateurs
    this.userForm.get('password')?.updateValueAndValidity();
    this.userForm.get('password2')?.updateValueAndValidity();
    
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedUser = null;
    this.userForm.reset();
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.userForm.controls).forEach(key => {
        this.userForm.get(key)?.markAsTouched();
      });
      return;
    }
    
    this.loading = true;
    const userData = { ...this.userForm.value };
    
    // Supprimer le champ de confirmation de mot de passe
    delete userData.password2;
    
    // Ne pas envoyer le mot de passe s'il est vide (en mode édition)
    if (this.isEditing && !userData.password) {
      delete userData.password;
    }
    
    if (this.isEditing && this.selectedUser) {
      this.userService.updateUser(this.selectedUser.id, userData).subscribe(
        (updatedUser) => {
          const index = this.users.findIndex(u => u.id === this.selectedUser?.id);
          if (index !== -1) {
            this.users[index] = updatedUser;
          }
          this.success = 'Utilisateur mis à jour avec succès';
          this.loading = false;
          this.closeModal();
        },
        (error) => {
          console.error('Erreur lors de la mise à jour de l\'utilisateur', error);
          this.error = 'Erreur lors de la mise à jour de l\'utilisateur';
          this.loading = false;
        }
      );
    } else {
      this.userService.createUser(userData).subscribe(
        (newUser) => {
          this.users.unshift(newUser);
          this.success = 'Utilisateur créé avec succès';
          this.loading = false;
          this.closeModal();
        },
        (error) => {
          console.error('Erreur lors de la création de l\'utilisateur', error);
          this.error = 'Erreur lors de la création de l\'utilisateur';
          this.loading = false;
        }
      );
    }
  }

  deleteUser(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ?')) {
      this.loading = true;
      this.userService.deleteUser(id).subscribe(
        () => {
          this.users = this.users.filter(user => user.id !== id);
          this.success = 'Utilisateur supprimé avec succès';
          this.loading = false;
        },
        (error) => {
          console.error('Erreur lors de la suppression de l\'utilisateur', error);
          this.error = 'Erreur lors de la suppression de l\'utilisateur';
          this.loading = false;
        }
      );
    }
  }

  toggleActive(user: User): void {
    this.userService.setActive(user.id, !user.is_active).subscribe(
      (response) => {
        user.is_active = response.is_active;
        this.success = `L'utilisateur est maintenant ${user.is_active ? 'actif' : 'inactif'}`;
      },
      (error) => {
        console.error('Erreur lors du changement de statut', error);
        this.error = 'Erreur lors du changement de statut';
      }
    );
  }

  toggleStaff(user: User): void {
    this.userService.setStaff(user.id, !user.is_staff).subscribe(
      (response) => {
        user.is_staff = response.is_staff;
        this.success = `L'utilisateur ${user.is_staff ? 'a maintenant' : 'n\'a plus'} les droits d'administration`;
      },
      (error) => {
        console.error('Erreur lors du changement de rôle', error);
        this.error = 'Erreur lors du changement de rôle';
      }
    );
  }

  changeRole(user: User, event: any): void {
    const newRole = (event.target as HTMLSelectElement).value;
    this.userService.setRole(user.id, newRole).subscribe(
      (response) => {
        user.role = response.role;
        this.success = `Le rôle de l'utilisateur a été changé en ${this.getRoleLabel(user.role)}`;
      },
      (error) => {
        console.error('Erreur lors du changement de rôle', error);
        this.error = 'Erreur lors du changement de rôle';
      }
    );
  }

  resetPassword(user: User): void {
    const newPassword = prompt('Entrez un nouveau mot de passe pour ' + user.username);
    if (newPassword && newPassword.length >= 8) {
      this.userService.resetPassword(user.id, newPassword).subscribe(
        () => {
          this.success = 'Mot de passe réinitialisé avec succès';
        },
        (error) => {
          console.error('Erreur lors de la réinitialisation du mot de passe', error);
          this.error = 'Erreur lors de la réinitialisation du mot de passe';
        }
      );
    } else if (newPassword) {
      this.error = 'Le mot de passe doit contenir au moins 8 caractères';
    }
  }

  // Récupérer les contrôles du formulaire pour la validation dans le template
  get usernameControl() { return this.userForm.get('username'); }
  get emailControl() { return this.userForm.get('email'); }
  get passwordControl() { return this.userForm.get('password'); }
  get password2Control() { return this.userForm.get('password2'); }

  // Obtenir un message d'erreur pour un champ spécifique
  getErrorMessage(field: string): string {
    const control = this.userForm.get(field);
    if (!control) return '';
    
    if (control.hasError('required')) {
      return 'Ce champ est requis';
    }
    
    if (control.hasError('minlength')) {
      const minLength = control.getError('minlength').requiredLength;
      return `Ce champ doit contenir au moins ${minLength} caractères`;
    }
    
    if (control.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    
    if (control.hasError('mismatch')) {
      return 'Les mots de passe ne correspondent pas';
    }
    
    return 'Erreur de validation';
  }

  // Méthode utilitaire pour gérer les erreurs des requêtes HTTP
  handleError(operation: string, error: any): void {
    console.error(`Erreur lors de ${operation}:`, error);
    this.error = `Une erreur est survenue lors de ${operation}. Veuillez réessayer.`;
    this.loading = false;
  }

  // Obtenir le libellé du rôle à partir de sa valeur
  getRoleLabel(role: string): string {
    const roleOption = this.roleOptions.find(option => option.value === role);
    return roleOption ? roleOption.label : role;
  }
}
