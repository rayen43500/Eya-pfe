import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProduitsComponent } from './pages/produits/produits.component';
import { CommandesComponent } from './pages/commandes/commandes.component';
import { UtilisateursComponent } from './pages/utilisateurs/utilisateurs.component';
import { PromotionsComponent } from './pages/promotions/promotions.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { AjouterPComponent } from './pages/ajouter-p/ajouter-p.component';
import { AuthGuard } from './guards/auth.guard';
import { LoginClientComponent } from './pages/esspace_client/login-client/login-client.component';
import { ShoopBordComponent } from './pages/esspace_client/shoop-bord/shoop-bord.component';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { LivreurDashboardComponent } from './pages/livreur/livreur-dashboard.component';
import { LoginLivreurComponent } from './pages/livreur/login-livreur.component';
import { LivreurAuthGuard } from './guards/livreur-auth.guard';
import { CheckoutComponent } from './pages/checkout/checkout.component';
import { AuthResetComponent } from './pages/auth-reset/auth-reset.component';
import { DirectDashboardComponent } from './pages/direct-dashboard/direct-dashboard.component';
import { AdminDirectDashboardComponent } from './pages/admin-direct-dashboard/admin-direct-dashboard.component';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { LivreurSignupComponent } from './pages/auth/livreur-signup.component';
import { MesCommandesComponent } from './pages/esspace_client/mes-commandes/mes-commandes.component';
import { CategoriesComponent } from './pages/categories/categories.component';

const routes: Routes = [
  { path: '', redirectTo: '/login-client', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'login-livreur', component: LoginLivreurComponent },
  { path: 'signup-livreur', component: LivreurSignupComponent },
  { path: 'login-client', component: LoginClientComponent },
  { path: 'auth-reset', component: AuthResetComponent },
  { path: 'direct-dashboard', component: DirectDashboardComponent },
  { path: 'direct-shoop-bord', component: ShoopBordComponent },
  { path: 'shoop-bord', component: ShoopBordComponent },
  { path: 'client-home', component: ShoopBordComponent },
  { path: 'direct-admin-dashboard', component: AdminDirectDashboardComponent },
  { path: 'admin-dashboard', component: AdminDirectDashboardComponent },
  { path: 'direct-commandes', component: CommandesComponent },
  { path: 'direct-utilisateurs', component: UtilisateursComponent },
  { path: 'statistics', component: StatisticsComponent, canActivate: [AdminAuthGuard] },
  { path: 'direct-statistics', component: StatisticsComponent },
  { path: 'reports', component: StatisticsComponent },
  { path: 'mes-commandes', component: MesCommandesComponent },
  { path: 'categories', component: CategoriesComponent },
  { path: 'direct-categories', component: CategoriesComponent },
  { 
    path: 'livreur',
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: LivreurDashboardComponent, canActivate: [LivreurAuthGuard] },
      { path: 'profile', component: LivreurDashboardComponent, canActivate: [LivreurAuthGuard] },
      { path: 'deliveries', component: LivreurDashboardComponent, canActivate: [LivreurAuthGuard] }
    ]
  },
  { path: 'livreur-dashboard', component: LivreurDashboardComponent, canActivate: [LivreurAuthGuard] },
  { path: 'checkout', component: CheckoutComponent },
  { path: 'checkout/:id', component: CheckoutComponent },
  { 
    path: 'dashboard', 
    component: DashboardComponent,
    canActivate: [AdminAuthGuard]
  },
  { 
    path: 'produits', 
    component: ProduitsComponent
  },
  { 
    path: 'ajouter-produit', 
    component: AjouterPComponent
  },
  { 
    path: 'modifier-produit/:id', 
    component: AjouterPComponent
  },
  { 
    path: 'commandes', 
    component: CommandesComponent,
    canActivate: [AdminAuthGuard]
  },
  { 
    path: 'utilisateurs', 
    component: UtilisateursComponent,
    canActivate: [AdminAuthGuard]
  },
  { 
    path: 'promotions', 
    component: PromotionsComponent
  },
  { 
    path: 'parametres', 
    component: ParametresComponent,
    canActivate: [AdminAuthGuard]
  },
  { 
    path: 'espaceclient', 
    canActivate: [ClientAuthGuard],
    children: [
      { path: '', redirectTo: 'shoop-bord', pathMatch: 'full' },
      { path: 'shoop-bord', component: ShoopBordComponent },
      { path: 'mes-commandes', component: MesCommandesComponent },
    ]
  },
  { path: '**', redirectTo: '/login-client' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
