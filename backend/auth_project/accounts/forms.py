from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import User, LivreurProfile, ClientProfile

class UserRegistrationForm(UserCreationForm):
    class Meta:
        model = User
        fields = ['username', 'email', 'password1', 'password2']

class UserLoginForm(AuthenticationForm):
    username = forms.CharField(label="Nom d'utilisateur", widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': "Nom d'utilisateur"}))
    password = forms.CharField(label="Mot de passe", widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Mot de passe'}))

class LivreurRegistrationForm(UserCreationForm):
    # Vous pouvez ajouter des champs spécifiques aux livreurs
    phone_number = forms.CharField(max_length=15, required=True, label="Numéro de téléphone")
    vehicle_type = forms.ChoiceField(
        choices=[('velo', 'Vélo'), ('moto', 'Moto'), ('voiture', 'Voiture')],
        label="Type de véhicule"
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'phone_number', 'vehicle_type', 'password1', 'password2']
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.role = 'livreur'
        
        # Vous pouvez stocker les informations supplémentaires dans un profil lié
        # ou dans des champs JSON si votre modèle User le permet
        
        if commit:
            user.save()
        return user

# Ajoutez cette nouvelle classe de formulaire pour le profil des livreurs
class LivreurProfileForm(forms.ModelForm):
    class Meta:
        model = LivreurProfile
        fields = ['phone_number', 'vehicle_type']
        labels = {
            'phone_number': 'Numéro de téléphone',
            'vehicle_type': 'Type de véhicule'
        }

class LivreurLoginForm(AuthenticationForm):
    username = forms.CharField(label="Nom d'utilisateur du livreur")
    password = forms.CharField(label="Mot de passe", widget=forms.PasswordInput)
    
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if user.role != 'livreur':
            raise forms.ValidationError("Ce compte n'est pas un compte livreur.")

class ClientLoginForm(AuthenticationForm):
    username = forms.CharField(label="Nom d'utilisateur du client", widget=forms.TextInput(attrs={'class': 'form-control', 'placeholder': "Nom d'utilisateur"}))
    password = forms.CharField(label="Mot de passe", widget=forms.PasswordInput(attrs={'class': 'form-control', 'placeholder': 'Mot de passe'}))
    
    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if user.role != 'client':
            raise forms.ValidationError("Ce compte n'est pas un compte client.")

class ClientRegistrationForm(UserCreationForm):
    email = forms.EmailField(required=True, label="Email", widget=forms.EmailInput(attrs={'placeholder': 'Entrez votre email'}))
    first_name = forms.CharField(max_length=100, required=True, label="Prénom", widget=forms.TextInput(attrs={'placeholder': 'Prénom'}))
    last_name = forms.CharField(max_length=100, required=True, label="Nom", widget=forms.TextInput(attrs={'placeholder': 'Nom'}))
    delivery_address = forms.CharField(widget=forms.Textarea(attrs={'placeholder': 'Votre adresse complète pour les livraisons', 'rows': 3}), required=True, label="Adresse de livraison")
    phone_number = forms.CharField(max_length=15, required=True, label="Téléphone", widget=forms.TextInput(attrs={'placeholder': 'Votre numéro de téléphone'}))
    
    class Meta:
        model = User
        fields = ['username', 'email', 'first_name', 'last_name', 'delivery_address', 'phone_number', 'password1', 'password2']
        widgets = {
            'username': forms.TextInput(attrs={'placeholder': 'Choisissez un nom d\'utilisateur'})
        }
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['password1'].widget = forms.PasswordInput(attrs={'placeholder': 'Choisissez un mot de passe'})
        self.fields['password2'].widget = forms.PasswordInput(attrs={'placeholder': 'Confirmez votre mot de passe'})
        self.fields['password1'].label = "Mot de passe"
        self.fields['password2'].label = "Confirmer le mot de passe"
    
    def save(self, commit=True):
        user = super().save(commit=False)
        user.role = 'client'
        
        # Sauvegardez l'utilisateur pour obtenir un ID
        if commit:
            user.save()
            
            # Créez le profil client associé
            ClientProfile.objects.create(
                user=user,
                first_name=self.cleaned_data['first_name'],
                last_name=self.cleaned_data['last_name'],
                delivery_address=self.cleaned_data['delivery_address'],
                phone_number=self.cleaned_data['phone_number']
            )
            
        return user 