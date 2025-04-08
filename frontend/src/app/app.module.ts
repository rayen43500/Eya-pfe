import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { AppComponent } from './app.component';
import { CommandesComponent } from './pages/commandes/commandes.component';
import { UtilisateursComponent } from './pages/utilisateurs/utilisateurs.component';
import { PromotionsComponent } from './pages/promotions/promotions.component';
import { ParametresComponent } from './pages/parametres/parametres.component';
import { CompteComponent } from './pages/esspace_client/compte/compte.component';
import { PanierComponent } from './pages/esspace_client/panier/panier.component';
import { ValiderCommandeComponent } from './pages/esspace_client/valider-commande/valider-commande.component';
import { RegisterLivreurComponent } from './pages/register-livreur/register-livreur.component';
import { LivreurSignupComponent } from './pages/auth/livreur-signup.component';

// Services and guards
import { AuthService } from './services/auth.service';
import { AuthClientService } from './services/auth-client.service';
import { AuthAdminService } from './services/auth-admin.service';
import { UserService } from './services/user.service';
import { AuthGuard } from './guards/auth.guard';
import { AdminAuthGuard } from './guards/admin-auth.guard';
import { ClientAuthGuard } from './guards/client-auth.guard';
import { LivreurAuthGuard } from './guards/livreur-auth.guard';

// Nouvel intercepteur unifié
import { UnifiedAuthInterceptor } from './auth/unified-auth.interceptor';

// Importation auto pour les modules standalone
import { provideImgixLoader } from '@angular/common';
import { StatisticsComponent } from './pages/statistics/statistics.component';
import { MesCommandesComponent } from './pages/esspace_client/mes-commandes/mes-commandes.component';

@NgModule({
  declarations: [
    AppComponent,
    CommandesComponent,
    UtilisateursComponent,
    PromotionsComponent,
    ParametresComponent,
    CompteComponent, 
    PanierComponent,
    ValiderCommandeComponent,
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    RouterModule,
    BrowserAnimationsModule,
    NgxChartsModule,
    MesCommandesComponent,
    StatisticsComponent
  ],
  providers: [
    provideClientHydration(),
    AuthService,
    AuthClientService,
    AuthAdminService,
    UserService,
    AuthGuard,
    AdminAuthGuard,
    ClientAuthGuard,
    LivreurAuthGuard,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: UnifiedAuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
