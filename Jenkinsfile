pipeline {
    agent any

    environment {
        PROJECT_ID   = "city-tales-authentication"
        REGION       = "us-central1"
        REPO_NAME    = "authentication"    // Artifact Registry repo name
        SERVICE      = "authentication"
        IMAGE        = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/authentication"
    }

    stages {
        stage('Setup Branch Vars') {
            steps {
                script {
                    env.RAW_BRANCH  = env.BRANCH_NAME ? env.BRANCH_NAME : "production"
                    env.SAFE_BRANCH = env.RAW_BRANCH.replaceAll('/', '-')
                    echo "🔀 Branch detected: RAW=${env.RAW_BRANCH}, SAFE=${env.SAFE_BRANCH}"
                }
            }
        }

        stage('Checkout submodules') {
        steps {
                // ensure submodules are in sync and fetched
                sh '''
                git submodule sync --recursive
                git submodule update --init --recursive --depth 1
                git submodule status --recursive
                '''
            }
        }

        stage('Generate Configs from Vault') {
            steps {
                withCredentials([string(credentialsId: 'doppler-token', variable: 'DOPPLER_TOKEN')]) {
                    sh "doppler secrets download --no-file --format env > .env"
                }
            }
        }

        stage('Validate Configs') {
            steps {
                sh '''
                for var in $(cat required_envs.txt); do
                    grep "^${var}=" .env || (echo "❌ Missing ${var}" && exit 1)
                done
                echo "✅ All required environment variables found"
                '''
            }
        }

        stage('Convert ENV to YAML') {
            steps {
                sh '''
                sed -E -e 's/\\\\/\\\\\\\\/g' \
                    -e 's/"/\\\\"/g' \
                    -e 's/^export[[:space:]]+//' \
                    -e 's/^([^=]+)=(.*)$/\\1: "\\2"/' .env > env.yaml
                echo "✅ env.yaml generated for Cloud Run"
                head -n 20 env.yaml
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    env.IMAGE_TAG = "${env.IMAGE}:${env.SAFE_BRANCH}-${env.BUILD_NUMBER}"
                    dir(env.WORKSPACE) {
                        sh "docker build -t $IMAGE_TAG ."
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

        stage('Deploy to Cloud Run') {
            steps {
                withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh """
                      gcloud run deploy ${SERVICE} \
                        --image $IMAGE_TAG \
                        --region ${REGION} \
                        --platform managed \
                        --allow-unauthenticated \
                        --port=8080 \
                        --use-http2 \
                        --cpu=1 \
                        --memory=512Mi \
                        --min-instances=0 \
                        --max-instances=1 \
                        --env-vars-file env.yaml
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful: ${env.RAW_BRANCH}"
        }
        failure {
            echo "❌ Deployment failed: ${env.RAW_BRANCH}"
        }
    }
}