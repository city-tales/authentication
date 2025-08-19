pipeline {
    agent any

    environment {
        PROJECT_ID   = "city-tales-authentication"
        REGION       = "us-central1"
        REPO_NAME    = "authentication"    // Artifact Registry repo name
        SERVICE      = "authentication"
        IMAGE        = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/authentication"

        // Use env var BRANCH_NAME from Jenkins or fallback to production
        RAW_BRANCH   = env.BRANCH_NAME ?: "production"
        // Replace slashes with dashes so Docker accepts it
        SAFE_BRANCH  = "${RAW_BRANCH.replaceAll('/', '-')}"
    }

    stages {
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
                sed 's/^\([^=]*\)=\(.*\)$/\1: "\2"/' .env > env.yaml
                echo "✅ env.yaml generated for Cloud Run"
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    env.IMAGE_TAG = "${IMAGE}:${SAFE_BRANCH}-${BUILD_NUMBER}"
                    sh "docker build -t ${env.IMAGE_TAG} ."
                }
            }
        }

        stage('Push to Artifact Registry') {
            steps {
                withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh '''
                      gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
                      gcloud auth configure-docker ${REGION}-docker.pkg.dev --quiet
                      docker push ${IMAGE_TAG}
                    '''
                }
            }
        }

        stage('Deploy to Cloud Run') {
            steps {
                withCredentials([file(credentialsId: 'gcp-sa-key', variable: 'GOOGLE_APPLICATION_CREDENTIALS')]) {
                    sh '''
                      gcloud run deploy ${SERVICE} \
                        --image ${IMAGE_TAG} \
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
                    '''
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful: ${RAW_BRANCH}"
        }
        failure {
            echo "❌ Deployment failed: ${RAW_BRANCH}"
        }
    }
}
