from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from .forms import UserRegistrationForm, UserLoginForm, LivreurRegistrationForm, LivreurProfileForm, LivreurLoginForm, ClientLoginForm, ClientRegistrationForm
from .models import LivreurProfile, ClientProfile
from django.views.decorators.csrf import ensure_csrf_cookie

# Fonctions de vérification des rôles
def is_admin(user):
    return user.is_authenticated and user.role == 'admin'

def is_livreur(user):
    return user.is_authenticated and user.role == 'livreur'

def is_client(user):
    return user.is_authenticated and user.role == 'client'

# Vue d'inscription
def register_view(request):
    if request.method == 'POST':
        form = ClientRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('client_dashboard')
    else:
        form = ClientRegistrationForm()
    return render(request, 'accounts/register.html', {'form': form})

# Vue de connexion
@ensure_csrf_cookie
def login_view(request):
    if request.method == 'POST':
        form = UserLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            
            # Redirection basée sur le rôle
            if user.role == 'admin':
                return redirect('admin_dashboard')
            elif user.role == 'livreur':
                return redirect('livreur_dashboard')
            else:
                return redirect('client_dashboard')
    else:
        form = UserLoginForm()
    return render(request, 'accounts/login.html', {'form': form})

# Vue de déconnexion
def logout_view(request):
    logout(request)
    return redirect('login')

# Tableaux de bord pour chaque rôle
@login_required
@user_passes_test(is_admin)
def admin_dashboard(request):
    return render(request, 'accounts/admin_dashboard.html')

@login_required
@user_passes_test(is_livreur)
def livreur_dashboard(request):
    try:
        profile = request.user.livreur_profile
        if not profile.is_approved:
            return render(request, 'accounts/livreur_pending.html')
        return render(request, 'accounts/livreur_dashboard.html')
    except LivreurProfile.DoesNotExist:
        return redirect('complete_profile')

@login_required
@user_passes_test(is_client)
def client_dashboard(request):
    return render(request, 'accounts/client_dashboard.html')

def register_livreur_view(request):
    if request.method == 'POST':
        form = LivreurRegistrationForm(request.POST)
        if form.is_valid():
            user = form.save()
            
            # Créer le profil livreur avec les informations du formulaire
            LivreurProfile.objects.create(
                user=user,
                phone_number=form.cleaned_data['phone_number'],
                vehicle_type=form.cleaned_data['vehicle_type']
            )
            
            login(request, user)
            return redirect('livreur_dashboard')
    else:
        form = LivreurRegistrationForm()
    return render(request, 'accounts/register_livreur.html', {'form': form})

@login_required
@user_passes_test(is_livreur)
def complete_profile(request):
    try:
        profile = request.user.livreur_profile
        return redirect('livreur_dashboard')
    except LivreurProfile.DoesNotExist:
        if request.method == 'POST':
            form = LivreurProfileForm(request.POST, request.FILES)
            if form.is_valid():
                profile = form.save(commit=False)
                profile.user = request.user
                profile.save()
                return redirect('livreur_dashboard')
        else:
            form = LivreurProfileForm()
        return render(request, 'accounts/complete_profile.html', {'form': form})

def login_livreur_view(request):
    if request.method == 'POST':
        form = LivreurLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('livreur_dashboard')
    else:
        form = LivreurLoginForm()
    return render(request, 'accounts/login_livreur.html', {'form': form})

def login_client_view(request):
    if request.method == 'POST':
        form = ClientLoginForm(request, data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('client_dashboard')
    else:
        form = ClientLoginForm()
    return render(request, 'accounts/login_client.html', {'form': form})

def home_view(request):
    return render(request, 'accounts/home.html') 