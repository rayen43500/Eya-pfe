import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatListModule } from '@angular/material/list';
import { MatTableModule } from '@angular/material/table';
import { DeliveryService, Delivery } from '../../services/delivery.service';
import { Subject, takeUntil, finalize } from 'rxjs';

@Component({
  selector: 'app-livreur-dashboard',
  templateUrl: './livreur-dashboard.component.html',
  styleUrls: ['./livreur-dashboard.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatChipsModule,
    MatListModule,
    MatTableModule
  ]
})
export class LivreurDashboardComponent implements OnInit, OnDestroy {
  shippedDeliveries: Delivery[] = [];
  loading = false;
  error = '';
  deliveryStats = {
    today: 0,
    inProgress: 0,
    completed: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private deliveryService: DeliveryService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadShippedDeliveries();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadShippedDeliveries() {
    this.loading = true;
    this.error = '';

    this.deliveryService.getShippedDeliveries()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (deliveries) => {
          console.log('Livraisons reçues:', deliveries);
          this.shippedDeliveries = deliveries;
          this.calculateStats();
          this.error = '';
        },
        error: (error) => {
          console.error('Erreur lors du chargement des livraisons:', error);
          this.error = error;
          this.shippedDeliveries = [];
          this.showErrorSnackBar(error);
        }
      });
  }

  calculateStats() {
    this.deliveryService.getDeliveryStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.deliveryStats = stats;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
          this.showErrorSnackBar('Erreur lors du chargement des statistiques');
        }
      });
  }

  markAsDelivered(orderId: string) {
    this.loading = true;

    this.deliveryService.markAsDelivered(orderId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.shippedDeliveries = this.shippedDeliveries.filter(d => d.id !== orderId);
          this.calculateStats();
          this.showSuccessSnackBar('Commande marquée comme livrée');
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du statut:', error);
          this.showErrorSnackBar(error);
        }
      });
  }

  cancelDelivery(orderId: string) {
    this.loading = true;

    this.deliveryService.cancelDelivery(orderId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: () => {
          this.shippedDeliveries = this.shippedDeliveries.filter(d => d.id !== orderId);
          this.calculateStats();
          this.showSuccessSnackBar('Commande annulée');
        },
        error: (error) => {
          console.error('Erreur lors de l\'annulation:', error);
          this.showErrorSnackBar(error);
        }
      });
  }

  private showSuccessSnackBar(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorSnackBar(message: string) {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
} 