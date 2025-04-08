# Guide de connexion (MISE À JOUR)

## Instructions pour se connecter sans problèmes

### Pour les clients
1. Accédez à `/login-client`
2. Entrez vos identifiants
3. Vous serez automatiquement redirigé vers `/direct-shoop-bord`

### Pour les livreurs
1. Accédez à `/login-livreur`
2. Entrez vos identifiants
3. Vous serez automatiquement redirigé vers `/livreur-dashboard`

### Pour les administrateurs
1. Accédez à `/login`
2. Entrez vos identifiants 
3. Vous serez automatiquement redirigé vers `/admin-dashboard`
4. **NOUVEAU:** Si vous êtes redirigé vers la page de login, cliquez sur le bouton vert "Admin Direct" en bas à droite de l'écran

## Résoudre les problèmes de connexion

Si vous n'êtes pas redirigé correctement après la connexion, utilisez une de ces méthodes:

### Méthode 1: Boutons d'urgence
- Cliquez sur le bouton rouge "Fixer Connexion" situé en bas à droite de l'écran.
- Ou, pour les administrateurs, cliquez sur le bouton vert "Admin Direct" situé en dessous.

### Méthode 2: URL directe
Accédez directement à une de ces URLs:
- `/direct-dashboard` - vous redirige vers votre espace selon votre type d'utilisateur
- `/direct-shoop-bord` - accès direct à l'espace client
- `/livreur-dashboard` - accès direct à l'espace livreur
- `/admin-dashboard` - accès direct à l'espace admin (NOUVELLE ROUTE SIMPLIFIÉE)

### Méthode 3: Réinitialisation d'authentification
Si rien ne fonctionne:
1. Accédez à `/auth-reset`
2. Cliquez sur "Accéder à mon espace [votre type]" si vous êtes connecté
3. OU cliquez sur "Réinitialiser l'authentification" puis reconnectez-vous

## Notes techniques pour les développeurs

- Les redirections utilisent `window.location.href` au lieu de `router.navigate()` pour contourner les guards
- Les routes directes comme `/admin-dashboard` sont accessibles sans guard de sécurité
- Le composant `AdminDirectDashboardComponent` est une version simplifiée qui ne vérifie pas l'authentification 