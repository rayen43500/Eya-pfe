import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { PromotionService } from '../../services/promotion.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-assign-promotion',
  templateUrl: './assign-promotion.component.html',
  styleUrls: ['./assign-promotion.component.css']
})
export class AssignPromotionComponent implements OnInit {
  promotionId: number;
  promotion: any;
  users: any[] = [];
  selectedUsers: number[] = [];
  
  constructor(
    private route: ActivatedRoute,
    private promotionService: PromotionService,
    private userService: UserService
  ) { }
  
  ngOnInit(): void {
    this.promotionId = +this.route.snapshot.paramMap.get('id');
    this.loadPromotion();
    this.loadUsers();
  }
  
  loadPromotion(): void {
    this.promotionService.getPromotionById(this.promotionId).subscribe(
      data => this.promotion = data
    );
  }
  
  loadUsers(): void {
    this.userService.getUsers().subscribe(
      data => this.users = data
    );
  }
  
  toggleUser(userId: number): void {
    const index = this.selectedUsers.indexOf(userId);
    if (index === -1) {
      this.selectedUsers.push(userId);
    } else {
      this.selectedUsers.splice(index, 1);
    }
  }
  
  assignPromotion(): void {
    if (this.selectedUsers.length === 0) {
      alert('Veuillez sélectionner au moins un utilisateur');
      return;
    }
    
    this.promotionService.assignPromotionToUsers(this.promotionId, this.selectedUsers).subscribe(
      response => {
        alert(`Promotion assignée à ${response.assigned_count} utilisateurs`);
      },
      error => {
        console.error('Erreur lors de l\'assignation', error);
      }
    );
  }
} 