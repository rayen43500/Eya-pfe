import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { AjouterPComponent } from './ajouter-p.component';

describe('AjouterPComponent', () => {
  let component: AjouterPComponent;
  let fixture: ComponentFixture<AjouterPComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AjouterPComponent ],
      imports: [ ReactiveFormsModule ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AjouterPComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with empty fields', () => {
    expect(component.productForm.get('name')!.value).toBe('');
    expect(component.productForm.get('description')!.value).toBe('');
    expect(component.productForm.get('price')!.value).toBe('');
    expect(component.productForm.get('quantity')!.value).toBe('');
    expect(component.productForm.get('category')!.value).toBe('');
    expect(component.productForm.get('imageUrl')!.value).toBe('');
  });

  it('should mark form as invalid when empty', () => {
    expect(component.productForm.valid).toBeFalsy();
  });

  it('should mark form as valid when all required fields are filled', () => {
    component.productForm.patchValue({
      name: 'Test Product',
      description: 'This is a test description',
      price: 99.99,
      quantity: 10,
      category: 'electronique'
    });
    expect(component.productForm.valid).toBeTruthy();
  });

  it('should reset form on resetForm()', () => {
    component.productForm.patchValue({
      name: 'Test Product',
      price: 99.99
    });
    component.resetForm();
    expect(component.productForm.get('name')!.value).toBe(null);
    expect(component.productForm.get('price')!.value).toBe(null);
  });
}); 