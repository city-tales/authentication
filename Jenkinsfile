pipeline {
    agent any

    environment {
        PROJECT_ID   = "city-tales-authentication"
        REGION       = "us-central1"
        REPO_NAME    = "authentication"    // Artifact Registry repo name
        SERVICE      = "authentication"
        IMAGE        = "${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}/auth-grpc"
        BRANCH_NAME  = env.BRANCH_NAME ?: "production"
    }

    stages {
        stage('Generate Configs from Vault') {
            steps {
                sh "doppler run -- cat > .env"
            }
        }

        stage('Validate Configs') {
            steps {
                sh """
                for var in \$(cat required_envs.txt); do
                    grep "\$var" .env || (echo "❌ Missing \$var" && exit 1)
                done
                echo '✅ All required environment variables found'
                """
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    IMAGE_TAG = "${IMAGE}:${BRANCH_NAME}-${BUILD_NUMBER}"
                    sh "docker build -t $IMAGE_TAG ."
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
                      gcloud run deploy $SERVICE \
                        --image $IMAGE_TAG \
                        --region $REGION \
                        --platform managed \
                        --allow-unauthenticated
                    """
                }
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful: ${BRANCH_NAME}"
        }
        failure {
            echo "❌ Deployment failed: ${BRANCH_NAME}"
        }
    }
}
