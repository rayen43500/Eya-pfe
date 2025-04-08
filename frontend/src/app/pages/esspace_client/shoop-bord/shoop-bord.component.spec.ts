import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShoopBordComponent } from './shoop-bord.component';

describe('ShoopBordComponent', () => {
  let component: ShoopBordComponent;
  let fixture: ComponentFixture<ShoopBordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShoopBordComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShoopBordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
