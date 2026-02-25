# Documentation Infrastructure Collector Shop

Cette infrastructure permet de déployer l'application `collector-shop` localement sur Minikube en reproduisant un environnement de type production via **Terraform** et **ArgoCD** (approche GitOps).

## Prérequis
1. [Minikube](https://minikube.sigs.k8s.io/docs/start/)
2. [Terraform](https://developer.hashicorp.com/terraform/install)
3. [Kubectl](https://kubernetes.io/docs/tasks/tools/)
4. Un dépôt GitHub contenant ce projet.

## Comment déployer l'infrastructure

### 1. Démarrer Minikube
Démarrez votre cluster local Minikube et activez l'addon ingress pour permettre l'accès externe.
```bash
minikube start --addons=ingress
```

### 2. Pousser le code sur GitHub (Important)
Étant donné qu'ArgoCD se base sur le GitOps, **vous devez pousser ce code sur votre repository GitHub**.
Ensuite : 
- Modifiez `infra/argo/application.yaml` pour y mettre l'URL de votre dépôt `repoURL`.
- Modifiez `infra/k8s/backend/deployment.yaml` et `infra/k8s/frontend/deployment.yaml` pour y mettre l'image Docker de votre registre (ex: `ghcr.io/VOTRE_COMPTE_GITHUB/...`).

### 3. Installer ArgoCD via Terraform
Basculez dans le dossier Terraform et appliquez la configuration pour installer ArgoCD sur votre Minikube.
```bash
cd infra/terraform
terraform init
terraform apply
```

### 4. Déployer l'application via ArgoCD
Une fois ArgoCD installé, appliquez la configuration de votre application GitOps.
```bash
cd ../.. # Retour à la racine du projet
kubectl apply -f infra/argo/application.yaml
```

### 5. Configurer la résolution DNS locale
Pour accéder aux applications via les noms de domaine locaux, ajoutez l'IP de votre minikube à votre fichier `/etc/hosts` (ou `C:\Windows\System32\drivers\etc\hosts`).
Trouvez l'IP de Minikube :
```bash
minikube ip
```
Ajoutez cette ligne dans votre fichier hosts (remplacez `<MINIKUBE_IP>`) :
```
<MINIKUBE_IP> api.collector-shop.local collector-shop.local minio.collector-shop.local
```

## Accès aux services
- **Frontend** : http://collector-shop.local
- **Backend API** : http://api.collector-shop.local
- **MinIO Console** : http://minio.collector-shop.local
- **ArgoCD UI** : Pour accéder à l'interface d'ArgoCD locale :
  ```bash
  kubectl port-forward svc/argocd-server -n argocd 8080:443
  ```
  (Accès via https://localhost:8080, le mot de passe initial se récupère via la CLI ArgoCD ou le secret kubernetes).
