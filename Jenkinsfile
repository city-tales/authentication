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

    stage('Checkout submodules') {
      steps {
        sh '''
          git submodule sync --recursive
          git submodule update --init --recursive --depth 1
          git submodule status --recursive
        '''
      }
    }

    stage('Fetch env.json from Doppler') {
      steps {
        withCredentials([string(credentialsId: 'doppler-token', variable: 'DOPPLER_TOKEN')]) {
          sh 'doppler secrets download --no-file --format json > env.json'
          sh 'echo "✅ Downloaded env.json from Doppler"'
        }
      }
    }

    stage('Validate env.json keys') {
      steps {
        sh '''
          node -e '
            const fs = require("fs");
            const env = JSON.parse(fs.readFileSync("env.json","utf8"));
            const required = fs.readFileSync("required_envs.txt","utf8").split(/\\r?\\n/).filter(Boolean);
            const missing = required.filter(k => !(k in env));
            if (missing.length) { console.error("❌ Missing keys:", missing.join(", ")); process.exit(1); }
            console.log("✅ All required environment variables found in env.json");
          '
        '''
      }
    }

    // Build both .env (for docker preflight) and env.yaml (for Cloud Run)
    // KEY POINTS:
    // - Convert any real newlines in JSON values to literal "\n"
    // - YAML single-quote values so backslashes remain literal (no special escaping)
    // - Escape single quotes in YAML by doubling them per YAML spec
    stage('Make .env and env.yaml from env.json') {
      steps {
        sh '''
          # .env for docker --env-file (single line KEY=VALUE, literal \\n sequences)
          node -e '
            const fs = require("fs");
            const env = JSON.parse(fs.readFileSync("env.json","utf8"));
            const lines = [];
            for (const [k,vRaw] of Object.entries(env)) {
              let v = String(vRaw).replace(/\\r/g, "");
              v = v.replace(/\\n/g, "\\n"); // keep literal backslash+n (if already literal, stays; if real newline, becomes \\n)
              // DO NOT add quotes in .env; docker expects raw KEY=VALUE
              lines.push(`${k}=${v}`);
            }
            fs.writeFileSync(".env", lines.join("\\n") + "\\n");
          '
          echo "✅ Wrote .env for docker preflight"

          # env.yaml for Cloud Run --env-vars-file (single-quoted so backslashes are literal)
          node -e '
            const fs = require("fs");
            const env = JSON.parse(fs.readFileSync("env.json","utf8"));
            const out = [];
            for (const [k,vRaw] of Object.entries(env)) {
              let v = String(vRaw).replace(/\\r/g, "");
              // Normalize any REAL newlines to literal \\n so app can .replace(/\\n/g,"\\n")
              v = v.replace(/\\n/g, "\\n");
              // YAML single-quoted escaping: single quote -> two single quotes
              v = v.replace(/\\x27/g, "\\x27"); // safeguard (rare)
              v = v.replace(/'/g, "''");
              out.push(`${k}: '${v}'`);
            }
            fs.writeFileSync("env.yaml", out.join("\\n") + "\\n");
          '
          echo "✅ Wrote env.yaml for Cloud Run"
        '''
      }
    }

    stage('Build Docker Image') {
      steps {
        script {
          env.IMAGE_TAG = "${env.IMAGE}:${env.SAFE_BRANCH}-${env.BUILD_NUMBER}"
          dir(env.WORKSPACE) {
            sh 'docker build -t $IMAGE_TAG .'
          }
        }
      }
    }

    stage('Push to Artifact Registry') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh """
            gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
            gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
            docker push $IMAGE_TAG
          """
        }
      }
    }

    // Prove the image actually listens on 8080 with your env before deploying
    stage('Preflight Container') {
      steps {
        sh """
          set -e
          docker rm -f preflight || true
          docker run -d --rm --name preflight --env-file .env -e PORT=8080 -p 18080:8080 $IMAGE_TAG
          for i in \$(seq 1 20); do ss -ltn | grep -q ':18080' && break; sleep 1; done
          ss -ltn | grep ':18080' || (echo '❌ Port 8080 not open'; docker logs preflight || true; docker rm -f preflight || true; exit 1)
          echo '✅ Container opened port 8080 locally'
          docker logs preflight || true
          docker rm -f preflight || true
        """
      }
    }

    stage('Deploy to Cloud Run') {
      steps {
        withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
          sh """
            gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
            gcloud run deploy ${SERVICE} \\
              --image $IMAGE_TAG \\
              --region ${REGION} \\
              --platform managed \\
              --allow-unauthenticated \\
              --port=8080 \\
              --timeout=300s \\
              --cpu=1 \\
              --memory=512Mi \\
              --min-instances=0 \\
              --use-http2 \\
              --max-instances=1 \\
              --env-vars-file env.yaml
          """
        }
      }
    }
  }

  post {
    success { echo "✅ Deployment successful: ${env.RAW_BRANCH}" }
    failure { echo "❌ Deployment failed: ${env.RAW_BRANCH}" }
  }
}
