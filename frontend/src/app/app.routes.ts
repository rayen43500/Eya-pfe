import { Routes } from '@angular/router';
import { AdminOrdersComponent } from './pages/admin/admin-orders/admin-orders.component';

export const routes: Routes = [
  // ... existing code ...
  {
    path: 'admin/orders',
    component: AdminOrdersComponent,
    title: 'Gestion des commandes'
  },
  // ... existing code ...
]; 