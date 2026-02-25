# Variables
MINIKUBE_PROFILE ?= default
TERRAFORM_DIR = terraform

.PHONY: help start stop install-argocd deploy port-forward clean status

# Affiche l'aide
help:
	@echo "🛠️  Infrastructure Collector Shop Commandes :"
	@echo "  make start          - Démarre minikube avec l'addon ingress"
	@echo "  make stop           - Arrête minikube"
	@echo "  make install-argocd - Initialise et applique Terraform pour installer ArgoCD"
	@echo "  make deploy         - Déploie l'application GitOps ArgoCD (synchronise le dossier k8s)"
	@echo "  make port-forward   - Rend ArgoCD accessible sur The localhost:8080"
	@echo "  make status         - Affiche le statut général du cluster minikube"
	@echo "  make hosts          - Ajoute l'IP de Minikube dans /etc/hosts (Nécessite sudo)"
	@echo "  make clean          - (!DANGER!) Détruit minikube et supprime l'état Terraform"

# Démarrer le cluster
start:
	@echo "🚀 Démarrage de Minikube..."
	minikube start --addons=ingress

# Arrêter le cluster
stop:
	@echo "💤 Arrêt de Minikube..."
	minikube stop

# Vérifier le statut
status:
	@echo "📊 Statut des pods :"
	kubectl get pods -A
	@echo "\n🌐 Adresses Ingress Minikube :"
	minikube ip

# Ajouter l'IP dans /etc/hosts pour l'ingress
hosts:
	@echo "📝 Ajout de l'IP de minikube à /etc/hosts..."
	@IP=$$(minikube ip); \
	if grep -q "collector-shop.local" /etc/hosts; then \
		echo "Les noms de domaine existent déjà dans /etc/hosts. Vérifiez manuellement qu'ils pointent bien vers $$IP."; \
	else \
		echo "sudo sh -c 'echo \"$$IP api.collector-shop.local collector-shop.local minio.collector-shop.local\" >> /etc/hosts'"; \
		sudo sh -c "echo \"$$IP api.collector-shop.local collector-shop.local minio.collector-shop.local\" >> /etc/hosts"; \
		echo "✅ Entrées ajoutées avec succès."; \
	fi

# Installer ArgoCD via Terraform
install-argocd:
	@echo "🏗️  Installation d'ArgoCD avec Terraform..."
	cd $(TERRAFORM_DIR) && terraform init && terraform apply -auto-approve

# Déployer l'application GitOps
deploy:
	@echo "🚢 Déploiement de l'Application ArgoCD (GitOps)..."
	kubectl apply -f argo/application.yaml
	@echo "Toutes vos ressources dans infra/k8s vont être synchronisées depuis Github !"

# Redirection de port pour ArgoCD
port-forward:
	@echo "🔓 Ouverture d'ArgoCD sur https://localhost:8080"
	@echo "Exécutez dans un autre terminal pour obtenir le mot de passe :"
	@echo "kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath=\"{.data.password}\" | base64 -d; echo"
	kubectl port-forward svc/argocd-server -n argocd 8080:443

# Nettoyer l'environnement (Danger)
clean:
	@echo "🧹 Nettoyage complet..."
	minikube delete
	rm -rf $(TERRAFORM_DIR)/.terraform $(TERRAFORM_DIR)/terraform.tfstate $(TERRAFORM_DIR)/terraform.tfstate.backup
	@echo "✅ Cluster détruit et état Terraform nettoyé."
