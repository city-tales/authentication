pipeline {
  agent any

  environment {
    PROJECT_ID = "city-tales-authentication"
    REGION     = "us-central1"
    REPO_NAME  = "authentication"
    SERVICE    = "authentication"
    IMAGE      = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/authentication"
  }

  stages {
    stage('Setup Branch Vars') {
      steps {
        script {
          env.RAW_BRANCH  = env.BRANCH_NAME ? env.BRANCH_NAME : "production"
          env.SAFE_BRANCH = env.RAW_BRANCH.replaceAll('/', '-')
          echo "🔀 Branch: raw=${env.RAW_BRANCH}  safe=${env.SAFE_BRANCH}"
        }
      }
    }

    stage('Validate Branch') {
      steps {
        script {
          def allowed = [
            'feature/jenkins-testing',
            'feature/docker-testing',
            'feature/automation-testing',
            'production'
          ]
          if (!allowed.contains(env.RAW_BRANCH)) {
            error "❌ Branch '${env.RAW_BRANCH}' is not allowed. Allowed branches: ${allowed.join(', ')}"
          }
          echo "✅ Branch '${env.RAW_BRANCH}' is allowed"
        }
      }
    }

    stage('Checkout submodules') {
      steps {
        sh(script: '''
          set -e
          git submodule sync --recursive
          git submodule update --init --recursive --depth 1
          git submodule status --recursive
        ''')
      }
    }

    stage('Fetch env.json from Doppler') {
      steps {
        withCredentials([string(credentialsId: 'doppler-token', variable: 'DOPPLER_TOKEN')]) {
          sh(script: '''
            set -e
            doppler secrets download --no-file --format json > env.json
            echo "✅ Downloaded env.json from Doppler"
          ''')
        }
      }
    }

    stage('Validate env.json keys') {
      steps {
        sh(script: '''
python3 - <<'PY'
import json, sys
from pathlib import Path

env = json.loads(Path("env.json").read_text(encoding="utf-8"))
required = [line.strip() for line in Path("required_envs.txt").read_text(encoding="utf-8").splitlines() if line.strip()]
missing = [k for k in required if k not in env]
if missing:
    print("❌ Missing keys:", ", ".join(missing))
    sys.exit(1)
print("✅ All required environment variables found in env.json")
PY
        ''')
      }
    }

    // Build both .env (for docker preflight) and env.yaml (for Cloud Run)
    stage('Make .env and env.yaml from env.json') {
      steps {
        sh(script: '''
python3 - <<'PY'
import json
from pathlib import Path

env = json.loads(Path("env.json").read_text(encoding="utf-8"))

def normalize(v: str) -> str:
    # Ensure values are strings, strip CR, turn real newlines into literal \\n
    s = str(v).replace("\\r", "")
    s = s.replace("\\n", "\\n")  # if JSON already has \\n it stays; if real newline, becomes \\n
    return s

# Write .env for docker --env-file (no quotes)
lines_env = []
for k, v in env.items():
    lines_env.append(f"{k}={normalize(v)}")
Path(".env").write_text("\\n".join(lines_env) + "\\n", encoding="utf-8")

# Write env.yaml for Cloud Run --env-vars-file using single quotes
# In YAML single-quoted scalars, backslashes are literal; single quote must be doubled.
lines_yaml = []
for k, v in env.items():
    s = normalize(v).replace("'", "''")
    lines_yaml.append(f"{k}: '{s}'")
Path("env.yaml").write_text("\\n".join(lines_yaml) + "\\n", encoding="utf-8")

print("✅ Wrote .env and env.yaml")
PY
        ''')
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          env.IMAGE_TAG = "${env.IMAGE}:${env.SAFE_BRANCH}-${env.BUILD_NUMBER}"
          dir(env.WORKSPACE) {
            sh(script: 'docker build -t "$IMAGE_TAG" .')
          }
        }
      }
    }

    stage('Push to Artifact Registry') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh(script: '''
            set -e
            gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
            gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
            docker push "$IMAGE_TAG"
          ''')
        }
      }
    }

    // Optional but recommended preflight: prove the image listens with your env
    stage('Preflight Container') {
      steps {
        sh(script: '''
          set -e
          docker rm -f preflight || true
          docker run -d --rm --name preflight --env-file .env -e PORT=8080 -p 18080:8080 "$IMAGE_TAG"
          for i in $(seq 1 20); do ss -ltn | grep -q ':18080' && break; sleep 1; done
          ss -ltn | grep ':18080' || (echo '❌ Port 8080 not open'; docker logs preflight || true; docker rm -f preflight || true; exit 1)
          echo '✅ Container opened port 8080 locally'
          docker logs preflight || true
          docker rm -f preflight || true
        ''')
      }
    }

    stage('Deploy to Cloud Run (HTTP/2)') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh(script: '''
            set -e
            gcloud auth activate-service-account --key-file="$GOOGLE_APPLICATION_CREDENTIALS"
            gcloud config set run/region ${REGION}
            gcloud config set run/platform managed

            # Deploy with HTTP/2 enabled
            gcloud run deploy ${SERVICE} \
              --image "$IMAGE_TAG" \
              --region ${REGION} \
              --platform managed \
              --allow-unauthenticated \
              --port=8080 \
              --use-http2 \
              --timeout=300s \
              --cpu=1 \
              --memory=512Mi \
              --min-instances=0 \
              --max-instances=1 \
              --env-vars-file env.yaml
          ''')
        }
      }
    }
  }

  post {
    success { echo "✅ Deployment successful: ${env.RAW_BRANCH}" }
    failure { echo "❌ Deployment failed: ${env.RAW_BRANCH}" }
  }
}
