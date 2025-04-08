from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User, AdminProfile, LivreurProfile, ClientProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role']
        read_only_fields = ['role']

class UserDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur pour afficher et gérer les détails complets d'un utilisateur"""
    date_joined = serializers.DateTimeField(read_only=True, format="%d/%m/%Y %H:%M")
    last_login = serializers.DateTimeField(read_only=True, format="%d/%m/%Y %H:%M", allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'is_active', 'is_staff', 'date_joined', 'last_login'
        ]
        read_only_fields = ['date_joined', 'last_login']
    
    def update(self, instance, validated_data):
        # Si un mot de passe est fourni, le hacher
        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)
            
        return super().update(instance, validated_data)
        
    def create(self, validated_data):
        # Extraire le mot de passe pour le hacher correctement
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        
        if password:
            user.set_password(password)
        user.save()
        
        return user

# Serializer de base pour l'enregistrement
class BaseRegistrationSerializer(serializers.ModelSerializer):
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas")
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        user = User(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            role=self.get_role()  # Méthode à implémenter dans les sous-classes
        )
        user.set_password(validated_data['password'])
        user.save()
        return user
    
    def get_role(self):
        # Cette méthode sera remplacée par les sous-classes
        return 'client'

# Serializer pour l'enregistrement des clients
class ClientRegistrationSerializer(BaseRegistrationSerializer):
    def get_role(self):
        return 'client'

# Serializer pour l'enregistrement des livreurs
class LivreurRegistrationSerializer(BaseRegistrationSerializer):
    vehicle_type = serializers.ChoiceField(choices=[
        ('velo', 'Vélo'), 
        ('moto', 'Moto'), 
        ('voiture', 'Voiture')
    ])
    phone_number = serializers.CharField(max_length=15)
    
    class Meta(BaseRegistrationSerializer.Meta):
        fields = BaseRegistrationSerializer.Meta.fields + ['vehicle_type', 'phone_number']
    
    def create(self, validated_data):
        vehicle_type = validated_data.pop('vehicle_type')
        phone_number = validated_data.pop('phone_number')
        
        user = super().create(validated_data)
        
        # Create livreur profile
        LivreurProfile.objects.create(
            user=user,
            vehicle_type=vehicle_type,
            phone_number=phone_number
        )
        
        return user
    
    def get_role(self):
        return 'livreur'

# Serializer pour l'enregistrement des admins
class AdminRegistrationSerializer(BaseRegistrationSerializer):
    def get_role(self):
        return 'admin'
    
    def create(self, validated_data):
        user = super().create(validated_data)
        user.is_staff = True  # Les admins ont accès à l'interface d'administration
        user.save()
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if not user.is_active:
                    raise serializers.ValidationError("Ce compte a été désactivé.")
                
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError("Nom d'utilisateur ou mot de passe incorrect.")
        else:
            raise serializers.ValidationError("Les champs 'username' et 'password' sont obligatoires.")

class ClientLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if user.role != 'client':
                    raise serializers.ValidationError("Ce compte n'est pas un compte client.")
                
                if not user.is_active:
                    raise serializers.ValidationError("Ce compte a été désactivé.")
                
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError("Nom d'utilisateur ou mot de passe incorrect.")
        else:
            raise serializers.ValidationError("Les champs 'username' et 'password' sont obligatoires.")

class AdminLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if user.role != 'admin':
                    raise serializers.ValidationError("Ce compte n'est pas un compte administrateur.")
                
                if not user.is_active:
                    raise serializers.ValidationError("Ce compte a été désactivé.")
                
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError("Nom d'utilisateur ou mot de passe incorrect.")
        else:
            raise serializers.ValidationError("Les champs 'username' et 'password' sont obligatoires.")

class LivreurLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if user:
                if user.role != 'livreur':
                    raise serializers.ValidationError("Ce compte n'est pas un compte livreur.")
                
                if not user.is_active:
                    raise serializers.ValidationError("Ce compte a été désactivé.")
                
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError("Nom d'utilisateur ou mot de passe incorrect.")
        else:
            raise serializers.ValidationError("Les champs 'username' et 'password' sont obligatoires.")

class LivreurProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    
    class Meta:
        model = LivreurProfile
        fields = [
            'id', 'username', 'email', 'phone_number', 
            'vehicle_type', 'vehicle_type_display', 'is_available', 
            'rating', 'total_deliveries', 'is_approved'
        ]
        read_only_fields = ['id', 'rating', 'total_deliveries', 'is_approved']

class ClientProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = ClientProfile
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'delivery_address'
        ]

class AdminCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})
    department = serializers.CharField(max_length=100, required=False)
    admin_level = serializers.ChoiceField(choices=[
        ('super', 'Super Admin'),
        ('manager', 'Manager'),
        ('support', 'Support')
    ], default='support')
    
    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")
        
        if User.objects.filter(username=data['username']).exists():
            raise serializers.ValidationError("Un utilisateur avec ce nom d'utilisateur existe déjà.")
        
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà.")
            
        return data
    
    def create(self, validated_data):
        validated_data.pop('password2')
        department = validated_data.pop('department', None)
        admin_level = validated_data.pop('admin_level', 'support')
        
        # Créer l'utilisateur
        user = User(
            username=validated_data['username'],
            email=validated_data['email'],
            role='admin',
            is_staff=True
        )
        user.set_password(validated_data['password'])
        user.save()
        
        # Créer le profil administrateur
        AdminProfile.objects.create(
            user=user,
            department=department,
            admin_level=admin_level,
            created_by=self.context['request'].user if 'request' in self.context else None
        )
        
        return user 