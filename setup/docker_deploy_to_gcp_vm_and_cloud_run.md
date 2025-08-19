# Deploy Authentication Service to GCP (VM + Cloud Run)

This guide turns the raw notes in `setup/raw_docker_vm_gcloud.md` into a clean, verified flow to:

- Provision a Debian VM with Docker
- Build and push a Docker image to Artifact Registry
- Deploy the container to Cloud Run (recommended for serving)

Optional: expose the VM on port 8080 for quick testing.

Note: Commands assume region `us-central1` and project `city-tales-authentication`. Adjust if needed.

---

## Prerequisites

- gcloud CLI installed (or use Cloud Shell)
- Project selected and authenticated
- Sufficient permissions (owner/editor is easiest for setup)

```bash
# Set variables (edit to taste)
PROJECT_ID="city-tales-authentication"
REGION="us-central1"
REPO="authentication"     # Artifact Registry repository name
SERVICE="authentication"   # Cloud Run service name
IMAGE_NAME="authentication"
VM_NAME="authentication-vm"
ZONE="us-central1-a"

# Set config
gcloud config set project "$PROJECT_ID"
gcloud config set compute/region "$REGION"
gcloud config set compute/zone "$ZONE"

# Login if needed (interactive)
gcloud auth login
```

### Enable required APIs

```bash
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  iam.googleapis.com
```

### Create Artifact Registry repository (if not created)

```bash
gcloud artifacts repositories create "$REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Docker images for authentication service"
# If it already exists, this will error; that's OK.
```

### Grant Artifact Registry writer (if using a user account)

Replace the email below with your account.

```bash
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:developerriyansh@gmail.com" \
  --role="roles/artifactregistry.writer"
```

---

## Create the VM (Debian 12 + Docker)

This VM installs Docker and Git on startup and tags the instance for firewall rules.

```bash
gcloud compute instances create "$VM_NAME" \
  --zone="$ZONE" \
  --machine-type=e2-micro \
  --image-family=debian-12 --image-project=debian-cloud \
  --boot-disk-size=20GB \
  --no-address \
  --tags=auth-svc,ssh \
  --metadata=startup-script='#!/bin/bash
set -euxo pipefail
apt-get update
apt-get install -y docker.io git
systemctl enable --now docker
'
```

Check VM status:

```bash
gcloud compute instances list --project="$PROJECT_ID"
```

### SSH access options

- Via IAP tunnel (no external IP, recommended):
    - Create an IAP SSH firewall rule once per VPC:
        ```bash
        gcloud compute firewall-rules create allow-ssh-iap \
          --network=default \
          --allow=tcp:22 \
          --source-ranges=35.235.240.0/20 \
          --direction=INGRESS \
          --priority=1000 \
          --target-tags=ssh
        ```
    - Connect:
        ```bash
        gcloud compute ssh "$VM_NAME" --zone "$ZONE" --tunnel-through-iap
        ```

- Optional: give the VM an external IP (not needed if using IAP):
    ```bash
    gcloud compute instances add-access-config "$VM_NAME" --zone="$ZONE"
    ```
    Retrieve the external IP (only if you added one):
    ```bash
    gcloud compute instances describe "$VM_NAME" --zone="$ZONE" \
      --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
    ```

### Optional firewall for local testing on VM (port 8080)

Open port 8080 to sources you trust (0.0.0.0/0 is not recommended for prod):

```bash
gcloud compute firewall-rules create authentication-ports \
  --allow=tcp:8080 \
  --target-tags=auth-svc \
  --direction=INGRESS \
  --network=default
```

---

## Prepare the VM

SSH into the VM (IAP recommended) and run:

```bash
# Ensure packages (startup already installed these, but safe to re-run)
sudo apt-get update -y
sudo apt-get install -y git docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"  # log out/in to take effect (or use sudo docker)

# Clone repo
cd ~
git clone https://github.com/city-tales/authentication.git
cd authentication

git submodule init
git submodule update
```

---

## Build the Docker image on the VM

```bash
sudo docker build -t "$IMAGE_NAME:latest" .
```

### Inject environment variables

If you use Doppler:

```bash
curl -Ls https://cli.doppler.com/install.sh | sudo sh
doppler login
# Write a .env file for local/docker use
doppler secrets download --no-file --format env-no-quotes > .env
```

---

## Install Google Cloud CLI on the VM (if pushing from the VM)

If you intend to run `gcloud auth configure-docker`, tag, push, or deploy from the VM, install and authenticate the Google Cloud CLI there:

```bash
sudo apt-get update && sudo apt-get install -y google-cloud-cli

# Authenticate (interactive)
gcloud auth login

# Optional: ensure you use a user account (not the default compute service account)
gcloud config set account "$(gcloud auth list --format='value(account)' | grep -v compute@developer.gserviceaccount.com | head -n1)"
```

Note: If `google-cloud-cli` is not available via apt on your image, follow the official install docs for Debian/Ubuntu to add the Google Cloud apt repository.

---

## Push the image to Artifact Registry

Configure Docker to authenticate to Artifact Registry for the region:

```bash
gcloud auth configure-docker "$REGION"-docker.pkg.dev -q

# If you need to push with sudo docker, also copy creds for root:
sudo mkdir -p /root/.docker
sudo cp "$HOME/.docker/config.json" /root/.docker/
```

Tag and push:

```bash
FULL_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}/${IMAGE_NAME}:latest"

sudo docker tag "$IMAGE_NAME:latest" "$FULL_IMAGE"
sudo docker push "$FULL_IMAGE"
```

---

## Deploy to Cloud Run (recommended)

Create an env file for Cloud Run from `.env` (simple sed; ensure your values do not contain unescaped quotes/newlines):

```bash
sed 's/^\([^=]*\)=\(.*\)$/\1: "\2"/' .env > env.yaml
```

Deploy:

```bash
gcloud run deploy "$SERVICE" \
  --image="$FULL_IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --use-http2 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=1 \
  --env-vars-file env.yaml
```

Retrieve URL:

```bash
gcloud run services describe "$SERVICE" --region="$REGION" --format='value(status.url)'
```

---

## Optional: Run on the VM directly (for testing only)

```bash
# Use .env created earlier
sudo docker run -d --env-file .env -p 8080:8080 "$IMAGE_NAME:latest"

sudo docker ps -a
sudo docker logs -f $(sudo docker ps -q --filter ancestor="$IMAGE_NAME:latest" | head -n1)
```

---

## Troubleshooting tips

- Ensure IAM: artifactregistry.writer for pushing to the repo, run.admin + iam.serviceAccountUser for advanced Cloud Run scenarios.
- If using IAP SSH, you may need role: roles/iap.tunnelResourceAccessor.
- If `gcloud auth configure-docker` works for your user, but `sudo docker push` fails, copy `~/.docker/config.json` to `/root/.docker/config.json`.
- If the repository path is `.../${REPO}/${IMAGE_NAME}:tag`, verify the repository actually exists in Artifact Registry at the chosen region.
- Avoid exposing the VM publicly; use IAP where possible. Prefer Cloud Run for serving.

---

## What changed from raw notes

- Added enabling APIs and creating the Artifact Registry repository.
- Consolidated and deduplicated Docker install and auth steps.
- Clarified IAP vs external IP SSH and port 8080 firewall as optional.
- Fixed double/duplicate pushes and mixed user/root Docker auth.
- Parameterized project/region/repo/service to reduce hardcoding.

---

## Reference

- For the original raw command list, see `setup/docker_vm_gcloud_commands.txt`.
