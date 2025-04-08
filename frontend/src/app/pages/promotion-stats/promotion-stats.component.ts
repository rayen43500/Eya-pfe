import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PromotionService } from '../../services/promotion.service';
import { Chart } from 'chart.js';

@Component({
  selector: 'app-promotion-stats',
  templateUrl: './promotion-stats.component.html',
  styleUrls: ['./promotion-stats.component.css']
})
export class PromotionStatsComponent implements OnInit {
  promotionId: number;
  promotion: any;
  stats: any;
  usageChart: any;
  discountChart: any;
  
  constructor(
    private route: ActivatedRoute,
    private promotionService: PromotionService
  ) { }
  
  ngOnInit(): void {
    this.promotionId = +this.route.snapshot.paramMap.get('id');
    this.loadPromotion();
    this.loadStats();
  }
  
  loadPromotion(): void {
    this.promotionService.getPromotionById(this.promotionId).subscribe(
      data => this.promotion = data
    );
  }
  
  loadStats(): void {
    this.promotionService.getPromotionStats(this.promotionId).subscribe(
      data => {
        this.stats = data;
        this.renderCharts();
      }
    );
  }
  
  renderCharts(): void {
    // Créer graphique d'utilisation quotidienne
    const dailyLabels = this.stats.daily_stats.map(day => day.day);
    const dailyData = this.stats.daily_stats.map(day => day.count);
    
    this.usageChart = new Chart('usageChart', {
      type: 'bar',
      data: {
        labels: dailyLabels,
        datasets: [{
          label: 'Utilisations par jour',
          data: dailyData,
          backgroundColor: 'rgba(124, 93, 250, 0.6)',
          borderColor: '#7c5dfa',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    
    // Créer graphique de remises mensuelles
    const monthlyLabels = this.stats.monthly_stats.map(month => month.month);
    const monthlyData = this.stats.monthly_stats.map(month => month.total_discount);
    
    this.discountChart = new Chart('discountChart', {
      type: 'line',
      data: {
        labels: monthlyLabels,
        datasets: [{
          label: 'Montant des remises par mois (€)',
          data: monthlyData,
          fill: false,
          backgroundColor: '#28c76f',
          borderColor: '#28c76f',
          tension: 0.1
        }]
      },
      options: {
        responsive: true
      }
    });
  }
} 