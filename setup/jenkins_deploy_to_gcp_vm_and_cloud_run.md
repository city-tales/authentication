# Jenkins on GCP VM — Setup and Useful gcloud Commands

This guide helps you provision and access a Jenkins server running on a Google Compute Engine VM. It cleans up and clarifies the steps from `setup/jenkins_vm_gcloud_commands.txt` with corrected commands and explanations.

Use these steps from Cloud Shell or any machine with gcloud access and appropriate IAM permissions.

---

## Prerequisites

- gcloud CLI installed and authenticated
- Project: `city-tales-authentication`
- VM instance (example): `authentication-vm`
- Zone (example): `us-central1-a`

Replace placeholders as needed:

- PROJECT_ID: `city-tales-authentication`
- INSTANCE_NAME: your VM name (e.g., `authentication-vm`)
- ZONE: your VM zone (e.g., `us-central1-a`)

---

## 1) Connect to VM via IAP (recommended)

If the VM is not publicly accessible, connect using IAP tunneling:

```bash
gcloud compute ssh INSTANCE_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --tunnel-through-iap
```

Example:

```bash
gcloud compute ssh authentication-vm \
  --project=city-tales-authentication \
  --zone=us-central1-a \
  --tunnel-through-iap
```

---

## 2) Install Java 17 and Jenkins

Run these commands on the VM after connecting via SSH.

```bash
# Install Java 17
sudo apt update && sudo apt install -y openjdk-17-jdk

# Clean any existing Jenkins repo config
sudo rm -f /etc/apt/sources.list.d/jenkins.list
sudo rm -f /usr/share/keyrings/jenkins-keyring.asc

# Add Jenkins repository key (2023 key)
curl -fsSL https://pkg.jenkins.io/debian/jenkins.io-2023.key | sudo tee \
  /usr/share/keyrings/jenkins-keyring.asc >/dev/null

# Add Jenkins apt repository
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list >/dev/null

# Install Jenkins
sudo apt update
sudo apt install -y jenkins
```

---

## 3) (Optional) Change Jenkins HTTP Port (default 8080 → example 8000)

Create a systemd drop-in and override the ExecStart to use port 8000.

```bash
sudo mkdir -p /etc/systemd/system/jenkins.service.d
sudo nano /etc/systemd/system/jenkins.service.d/override.conf
```

Paste the following content, save, and exit:

```
[Service]
ExecStart=
ExecStart=/usr/bin/java -Djava.awt.headless=true -jar /usr/share/java/jenkins.war --httpPort=8000
```

Apply and restart Jenkins:

```bash
sudo systemctl daemon-reload
sudo systemctl restart jenkins
sudo systemctl status jenkins -l
```

---

## 4) Tag VM for Firewall Targeting

Add a network tag (e.g., `jenkins-server`) to the VM for firewall rules.

```bash
gcloud compute instances add-tags INSTANCE_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --tags=jenkins-server
```

Example:

```bash
gcloud compute instances add-tags authentication-vm \
  --project=city-tales-authentication \
  --zone=us-central1-a \
  --tags=jenkins-server
```

---

## 5) Open Firewall for Jenkins Port

Create a firewall rule to allow inbound traffic to the Jenkins port (8000 in this example) for VMs tagged `jenkins-server`.

```bash
gcloud compute firewall-rules create allow-jenkins-8000 \
  --project=PROJECT_ID \
  --allow=tcp:8000 \
  --source-ranges=0.0.0.0/0 \
  --target-tags=jenkins-server
```

If you use the default Jenkins port 8080, change `tcp:8000` to `tcp:8080` and update the rule name accordingly.

---

## 6) Get Jenkins Initial Admin Password

After Jenkins starts, retrieve the initial admin password to complete setup in the UI:

```bash
sudo cat /var/lib/jenkins/secrets/initialAdminPassword
```

---

## 7) Install Useful Jenkins Plugins

In the Jenkins UI, navigate to Manage Jenkins → Plugins and install:

- Blue Ocean
- Git
- Pipeline: Stage View

---

## 8) Get External IP of the VM

Use the following to fetch the external IP address for the VM:

```bash
gcloud compute instances describe INSTANCE_NAME \
  --project=PROJECT_ID \
  --zone=ZONE \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

Example:

```bash
gcloud compute instances describe authentication-vm \
  --project=city-tales-authentication \
  --zone=us-central1-a \
  --format="get(networkInterfaces[0].accessConfigs[0].natIP)"
```

---

## 9) Allow Jenkins User to Use Docker (if needed)

If your builds use Docker and you see permission errors, add `jenkins` to the `docker` group and restart Jenkins.

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

---

## 10) Add Credentials in Jenkins (Required)

Create these in: Manage Jenkins → Credentials.

- doppler-token (Kind: Secret text)
    - Value: Token that allows `doppler secrets download` for your environment
- gcp-sa-key (Kind: Secret file)
    - File: Service Account JSON key with permissions to push to Artifact Registry and deploy Cloud Run
    - Suggested roles: `roles/run.admin`, `roles/artifactregistry.admin`, `roles/iam.serviceAccountUser`

The pipeline uses these IDs exactly inside the `Jenkinsfile` via `withCredentials(...)` blocks. Ensure names match.

### Pipeline Snapshot

Below is an example Blue Ocean view of a successful run across all stages:

![Jenkins Blue Ocean Pipeline](./assets/jenkins-pipeline-blueocean.png)

> If the image doesn't render, place your screenshot at `setup/assets/jenkins-pipeline-blueocean.png`.

---

## Notes

- Prefer IAP over opening wide firewall access. If possible, restrict `--source-ranges` to your office/VPN IPs.
- Keep secrets out of the VM. Use secret managers or Jenkins credentials.
- Keep the OS and Jenkins updated regularly.
- For the raw, unformatted command list, refer to `setup/jenkins_vm_gcloud_commands.txt`.
