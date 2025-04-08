import { Component, OnInit, HostListener, NgZone } from '@angular/core';
import { 
  StatsService, 
  DashboardStats, 
  SalesData, 
  CategoryData, 
  TopProduct,
  StatsPeriod
} from '../../services/stats.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { Router } from '@angular/router';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-statistics',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxChartsModule],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.css'
})
export class StatisticsComponent implements OnInit {
  stats: DashboardStats | null = null;
  loading = true;
  error: string | null = null;
  selectedPeriod: StatsPeriod = 'monthly';
  
  // Palette de couleurs pour les graphiques
  colors: string[] = [
    '#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', 
    '#2A79A7', '#7D4EFF', '#FF9800', '#2196F3', 
    '#4CAF50', '#FF5722', '#9C27B0', '#E91E63'
  ];
  
  // Dimensions de la fenêtre pour la réactivité
  windowWidth: number = window.innerWidth;

  constructor(
    private statsService: StatsService,
    private ngZone: NgZone,
    private router: Router
  ) {}

  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    this.windowWidth = window.innerWidth;
  }

  ngOnInit(): void {
    this.loadStats();
  }

  loadStats(): void {
    this.loading = true;
    this.error = null;
    
    // Nettoyer les données actuelles avant de charger les nouvelles
    this.stats = null;

    this.statsService.getDashboardStats(this.selectedPeriod).subscribe({
      next: (data) => {
        // Utiliser setTimeout pour donner le temps au DOM de se mettre à jour
        setTimeout(() => {
          this.ngZone.run(() => {
            this.stats = data;
            this.loading = false;
            console.log('Statistiques chargées:', data);
          });
        }, 100);
      },
      error: (err) => {
        this.ngZone.run(() => {
          this.error = err.message || 'Une erreur est survenue lors du chargement des statistiques';
          this.loading = false;
          console.error('Erreur de chargement des statistiques:', err);
        });
      }
    });
  }

  onPeriodChange(period: StatsPeriod): void {
    if (this.selectedPeriod === period) return;
    
    this.selectedPeriod = period;
    this.loadStats();
  }
  
  /**
   * Actualise les données des statistiques
   */
  refreshStats(): void {
    this.loadStats();
  }
  
  /**
   * Exporte les statistiques en PDF
   */
  exportStats(): void {
    if (!this.stats) {
      alert('Aucune donnée statistique à exporter');
      return;
    }
    
    const doc = new jsPDF();
    let yPosition = 40;
    
    // Titre et informations générales
    doc.setFontSize(20);
    doc.text("Rapport Statistique", 105, 15, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    
    const periodTitle = this.getPeriodTitle();
    doc.text(`Statistiques ${periodTitle} - ${new Date().toLocaleDateString('fr-FR')}`, 105, 25, { align: 'center' });
    
    // Statistiques générales
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text("Résumé des ventes", 14, 35);
    
    const generalData = [
      ['Total des ventes', this.formatAmount(this.stats.totalSales)],
      ['Nombre de commandes', `${this.stats.totalOrders}`],
      ['Nombre de clients', `${this.stats.totalCustomers}`],
      ['Panier moyen', this.formatAmount(this.stats.averageOrderValue)],
      ['Évolution des ventes', `${this.stats.salesTrend.percentage}% ${this.stats.salesTrend.isPositive ? '↑' : '↓'}`]
    ];
    
    autoTable(doc, {
      startY: yPosition,
      head: [['Indicateur', 'Valeur']],
      body: generalData,
      theme: 'striped',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14 }
    });
    
    // Mise à jour de la position Y pour la section suivante
    yPosition = 100; // Position approximative après le tableau général
    
    // Produits les plus vendus
    doc.setFontSize(14);
    doc.text("Top Produits", 14, yPosition);
    
    const topProductsData = this.stats.topProducts.map(product => [
      product.name,
      product.sales.toString(),
      this.formatAmount(product.revenue)
    ]);
    
    autoTable(doc, {
      startY: yPosition + 5,
      head: [['Produit', 'Quantité vendue', 'Chiffre d\'affaires']],
      body: topProductsData,
      theme: 'striped',
      headStyles: { fillColor: [46, 204, 113], textColor: 255 },
      margin: { left: 14 }
    });
    
    // Mise à jour de la position Y pour la section suivante
    yPosition = 150; // Position approximative après le tableau des produits
    
    // Ventes par catégorie
    doc.setFontSize(14);
    doc.text("Ventes par catégorie", 14, yPosition);
    
    const categoryData = this.stats.categorySales.map(cat => [
      cat.name,
      this.formatAmount(cat.value)
    ]);
    
    autoTable(doc, {
      startY: yPosition + 5,
      head: [['Catégorie', 'Montant des ventes']],
      body: categoryData,
      theme: 'striped',
      headStyles: { fillColor: [155, 89, 182], textColor: 255 },
      margin: { left: 14 }
    });
    
    // Mise à jour de la position Y pour la section suivante
    yPosition = 200; // Position approximative après le tableau des catégories
    
    // Ventes par région
    if (this.stats.revenueByRegion && Object.keys(this.stats.revenueByRegion).length > 0) {
      doc.setFontSize(14);
      doc.text("Ventes par région", 14, yPosition);
      
      const regionData = Object.entries(this.stats.revenueByRegion).map(([region, value]) => [
        region,
        this.formatAmount(value as number)
      ]);
      
      autoTable(doc, {
        startY: yPosition + 5,
        head: [['Région', 'Montant des ventes']],
        body: regionData,
        theme: 'striped',
        headStyles: { fillColor: [211, 84, 0], textColor: 255 },
        margin: { left: 14 }
      });
    }
    
    // Pied de page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Page ${i} sur ${pageCount}`, 105, doc.internal.pageSize.height - 10, { align: 'center' });
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, 105, doc.internal.pageSize.height - 5, { align: 'center' });
    }
    
    // Télécharger le PDF
    const fileName = `statistiques_${this.selectedPeriod}_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
  }
  
  /**
   * Obtient un titre descriptif de la période sélectionnée
   */
  private getPeriodTitle(): string {
    switch (this.selectedPeriod) {
      case 'daily': return 'journalières';
      case 'weekly': return 'hebdomadaires';
      case 'monthly': return 'mensuelles';
      case 'yearly': return 'annuelles';
      default: return '';
    }
  }

  /**
   * Obtient la valeur maximale dans une série de données
   */
  getMaxValue(series: {name: string, value: number}[]): number {
    if (!series || series.length === 0) return 1;
    return Math.max(...series.map(item => item.value));
  }

  /**
   * Obtient la valeur maximale dans les données de régions
   */
  getMaxRegionValue(): number {
    const regionData = this.getRegionData();
    if (!regionData || regionData.length === 0) return 1;
    return Math.max(...regionData.map(item => item.value));
  }

  /**
   * Calcule la somme totale des valeurs par catégorie
   */
  getTotalCategoryValue(): number {
    if (!this.stats || !this.stats.categorySales) return 1;
    return this.stats.categorySales.reduce((sum, category) => sum + category.value, 0);
  }

  /**
   * Retourne une couleur pour une barre de graphique
   */
  getBarColor(index: number): string {
    return this.colors[index % this.colors.length];
  }

  // Transformer les données de ventes par région pour les graphiques
  getRegionData(): {name: string, value: number}[] {
    if (!this.stats || !this.stats.revenueByRegion) {
      return [];
    }
    
    return Object.entries(this.stats.revenueByRegion)
      .map(([region, amount]) => ({
        name: region,
        value: amount
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8); // Limiter à 8 régions pour une meilleure lisibilité
  }

  // Méthode pour formater les montants pour l'affichage
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  }
}
