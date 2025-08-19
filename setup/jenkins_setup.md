# Jenkins CI/CD Setup for authentication (using Jenkinsfile)

This README explains how to set up a Jenkins pipeline that builds and deploys the `authentication` service to Google Cloud Run using the provided `Jenkinsfile` in the repository root.

The pipeline:

- Downloads secrets into `env.json` from Doppler
- Validates required env keys (`required_envs.txt`)
- Generates `.env` and `env.yaml`
- Builds and pushes a Docker image to Artifact Registry
- Optionally preflights the container locally
- Deploys to Cloud Run with HTTP/2 enabled

---

## Prerequisites

- A running Jenkins server (see `setup/` docs for VM instructions)
- Jenkins plugins:
    - Git
    - Pipeline
    - Blue Ocean (optional)
- Google Cloud project: `city-tales-authentication`
- Artifact Registry enabled in the project
- Cloud Run API enabled
- Jenkins can run Docker locally on the agent
    - If using the VM instructions, add Jenkins user to Docker group: `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins`

---

## Required Jenkins Credentials

Create these credentials in Jenkins → Manage Jenkins → Credentials.

- doppler-token (Kind: Secret text)
    - Value: Token that allows `doppler secrets download` for your config
- gcp-sa-key (Kind: Secret file)
    - File: Service Account JSON key with permissions to push to Artifact Registry and deploy Cloud Run
    - Suggested roles: `roles/run.admin`, `roles/artifactregistry.admin`, `roles/iam.serviceAccountUser`

---

## Branch Policy (Important)

The `Jenkinsfile` restricts deployments to the following branches only:

- `feature/jenkins-testing`
- `feature/docker-testing`
- `feature/automation-testing`
- `production`

Pipelines on other branches will fail early with a clear error.

---

## How the Pipeline Works (Stages)

Defined in `Jenkinsfile`:

1. Setup Branch Vars

- Derives `env.RAW_BRANCH` from `env.BRANCH_NAME` (defaults to `production` when not set)
- Computes `env.SAFE_BRANCH` (replaces `/` with `-`) used in image tags

2. Validate Branch

- Fails if `env.RAW_BRANCH` is not in the allowlist above

3. Checkout submodules

- Syncs and initializes git submodules

4. Fetch env.json from Doppler

- Uses `withCredentials(doppler-token)`
- Runs `doppler secrets download --no-file --format json > env.json`

5. Validate env.json keys

- Python script compares keys in `required_envs.txt`
- Fails if any are missing

6. Make .env and env.yaml from env.json

- Generates a Docker-compatible `.env`
- Generates `env.yaml` for Cloud Run `--env-vars-file`

7. Build Docker Image

- Builds image and tags: `${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/authentication:${SAFE_BRANCH}-${BUILD_NUMBER}`

8. Push to Artifact Registry

- Authenticates using `gcp-sa-key`
- `docker push` to Artifact Registry

9. Preflight Container (Optional but included)

- Runs the container locally on the agent with `.env`
- Verifies port 8080 comes up on a mapped local port 18080

10. Deploy to Cloud Run (HTTP/2)

- Authenticates with `gcp-sa-key`
- Deploys service `${SERVICE}` in region `${REGION}` with `--use-http2`
- Uses `env.yaml` for environment variables

Post

- Prints success/failure with branch name

---

## Pipeline Environment Variables

Configured in `Jenkinsfile` under `environment {}`. Defaults:

- `PROJECT_ID = "city-tales-authentication"`
- `REGION     = "us-central1"`
- `REPO_NAME  = "authentication"`
- `SERVICE    = "authentication"`
- `IMAGE      = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/authentication"`

You can modify these in the `Jenkinsfile` to match your environment.

---

## Setting Up the Jenkins Job

You can use either a Multibranch Pipeline or a Pipeline job from SCM.

- Multibranch Pipeline (recommended):
    1. New Item → Multibranch Pipeline
    2. Add Branch Source → Git
    3. Repository URL: your repo URL
    4. Credentials: (if needed for private repo)
    5. Build Configuration: by Jenkinsfile (keep default Jenkinsfile path)
    6. Save; Jenkins will discover allowed branches and build on commit

- Pipeline (classic) from SCM:
    1. New Item → Pipeline
    2. Definition: Pipeline script from SCM
    3. SCM: Git
    4. Repository URL and credentials
    5. Script Path: `Jenkinsfile`
    6. Save

Note: Only allowed branches will proceed past the `Validate Branch` stage.

---

## Agent Requirements

- Docker installed and usable by the Jenkins user
- `gcloud` and `doppler` CLIs installed on the build agent
    - doppler must be able to use the `doppler-token`
    - gcloud is used with the injected service account key file
- Network egress to Artifact Registry and Cloud Run APIs

---

## Add Credentials in Jenkins (Required)

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

## Local environment loader (Node app)

The Node app includes `src/config/env_json_loader.js`, which loads `env.json` at runtime without overriding existing `process.env` variables. This is helpful for local runs and matches the CI behavior after the Doppler step.

---

## Troubleshooting

- Branch fails during Validate Branch
    - Ensure you're committing to one of the allowed branches listed above
- Missing env keys during validation
    - Make sure your Doppler config includes all the keys in `required_envs.txt`
- Docker build or permission errors
    - Verify Jenkins user is in the `docker` group and Docker daemon is running
- Artifact Registry push denied
    - Check that the service account has proper roles and the Artifact Registry host matches your region
- Cloud Run deploy fails
    - Confirm APIs are enabled and the service account has `roles/run.admin`

---

## File references

- Jenkins pipeline: `Jenkinsfile`
- Required keys: `required_envs.txt`
- Env loader: `src/config/env_json_loader.js`
- Raw VM setup commands: `setup/jenkins_vm_gcloud_commands.txt`

---

## Security Notes

- Never commit real secrets to the repository.
- Use Jenkins Credentials for tokens/keys and reference them in the pipeline.
- Limit branch deployments through the existing allowlist or tighten further as needed.
