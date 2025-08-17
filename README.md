# Authentication Service

A comprehensive, production-ready authentication microservice built with Node.js, TypeScript, and gRPC. This service provides multiple authentication methods including email/password, Google OAuth, and passwordless authentication with robust security features.

## 🚀 Features

### Authentication Methods

- **Email/Password Authentication**
    - User registration with email verification
    - Secure login with password hashing
    - Password reset functionality
    - Email verification system

- **Google OAuth Integration**
    - Google Sign-In support
    - Automatic user profile creation
    - Token-based session management

- **Passwordless Authentication**
    - Magic link authentication
    - Device-based authentication
    - Secure token generation

### Security Features

- **JWT Token Management**
    - Short-lived and long-lived tokens
    - Token refresh mechanism
    - Secure token storage and validation

- **Password Security**
    - bcrypt password hashing
    - Salt generation for each password
    - Password strength validation

- **Device Management**
    - Device tracking and fingerprinting
    - Multi-device session management
    - IP address and browser tracking

### Infrastructure

- **Database**: PostgreSQL with connection pooling
- **Caching**: Redis for session and token storage
- **Logging**: Grafana Loki integration for centralized logging
- **Queue Management**: Bull/BullMQ for background jobs
- **API**: gRPC for high-performance communication

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 15+
- Redis 6+
- TypeScript 5.8+

## 🛠️ Installation

1. **Clone the repository**

    ```bash
    git clone https://github.com/city-tales/authentication.git
    cd authentication
    ```

2. **Install dependencies**

    ```bash
    npm install
    ```

3. **Environment Setup**
   Create a `.env` file in the root directory (gRPC-only service):

    ```env
    # Server Configuration (Cloud Run will provide PORT). Locally default to 8080
    GRPC_PORT=8080
    GRPC_BASE_URL=0.0.0.0
    NODE_ENV=development

    # Database Configuration
    DATABASE_URL=postgresql://username:password@host:port/database
    DB_USERNAME=your_username
    DB_DATABASE=your_database
    DB_HOST=your_host
    DB_PASSWORD=your_password
    DB_PORT=5432

    # Redis Configuration
    CACHE_DB_REDIS_USERNAME=your_redis_username
    CACHE_DB_REDIS_PASSWORD=your_redis_password
    CACHE_DB_REDIS_HOST=your_redis_host
    CACHE_DB_REDIS_PORT=6379

    # JWT Configuration
    JWT_PRIVATE_KEY=your_private_key
    JWT_PUBLIC_KEY=your_public_key

    # Google OAuth
    GOOGLE_CLIENT_ID=your_google_client_id
    GOOGLE_CLIENT_SECRET=your_google_client_secret

    # Email Configuration
    EMAIL_HOST=smtp.gmail.com
    EMAIL_PORT=587
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password

    # Loki Logging
    LOKI_URL=your_loki_url
    LOKI_USERNAME=your_loki_username
    LOKI_PASSWORD=your_loki_password
    ```

## 🗄️ Database Setup

### PostgreSQL Setup

Follow the detailed setup guide in `setup/postgresql.md`:

1. **Render Hosting** (Recommended for production)
    - Create PostgreSQL database on Render
    - Use PostgreSQL version 15
    - Get the external database URL

2. **Local Development**
    - Install PostgreSQL locally
    - Create database and user
    - Update environment variables

### Database Migrations

The service includes automatic database migrations for:

- User management tables
- Authentication tokens
- Device tracking
- Email verification

## 🔧 Development

### Build the Project

```bash
npm run build
```

### Start the Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Code Formatting

```bash
npm run pretty
```

## 📡 API Documentation

### gRPC Services

The service exposes the following gRPC services:

#### 1. Email Authentication Service

```protobuf
service EmailAuthentication {
  rpc EmailSignup(EmailSignupRequest) returns (EmailSignupResponse);
  rpc EmailLogin(EmailLoginRequest) returns (EmailLoginResponse);
  rpc EmailVerification(EmailVerificationRequest) returns (EmailVerificationResponse);
  rpc EmailForgotPassword(EmailForgotPasswordRequest) returns (EmailForgotPasswordResponse);
  rpc UpdatePasswordForEmail(UpdatePasswordForEmailRequest) returns (UpdatePasswordForEmailResponse);
}
```

#### 2. Google Authentication Service

```protobuf
service GoogleAuthentication {
  rpc GoogleAuth(GoogleAuthRequest) returns (GoogleAuthResponse);
}
```

#### 3. Passwordless Authentication Service

```protobuf
service PasswordlessAuthentication {
  rpc PasswordlessAuth(PasswordlessAuthRequest) returns (PasswordlessAuthResponse);
}
```

## 🔐 Security Features

### Password Security

- **Hashing**: Uses scrypt for password hashing
- **Salt**: Unique salt for each password
- **Strength**: Configurable password strength requirements

### Token Security

- **JWT Tokens**: Signed with private/public key pairs
- **Expiration**: Configurable token expiration times
- **Refresh**: Automatic token refresh mechanism
- **Revocation**: Token revocation on logout

### Device Security

- **Fingerprinting**: Device fingerprinting for security
- **Session Management**: Multi-device session tracking
- **IP Tracking**: IP address logging for security

## 📊 Monitoring & Logging

### Grafana Loki Integration

The service integrates with Grafana Loki for centralized logging:

1. **Setup**: Follow the guide in `setup/loki.md`
2. **Configuration**: Update environment variables
3. **Monitoring**: View logs in Grafana Cloud dashboard

### Log Levels

- **INFO**: General application logs
- **ERROR**: Error tracking and debugging
- **WARN**: Warning messages
- **DEBUG**: Detailed debugging information

## 🚀 Deployment

### Production Deployment

1. **Environment Variables**: Set all required environment variables
2. **Database**: Use production PostgreSQL instance
3. **Redis**: Use production Redis instance
4. **Build**: Run `npm run build`
5. **Start**: Run `npm start`

### Docker Deployment (gRPC-only)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5051
CMD ["node", "dist/index.js"]
```

## 🧪 Testing

### Unit Tests

```bash
npm test
```

### Integration Tests

```bash
npm run test:integration
```

## 📁 Project Structure

```
authentication/
├── src/
│   ├── config/           # Configuration files
│   ├── controllers/      # Business logic controllers
│   ├── database/         # Database models and migrations
│   ├── grpc/            # gRPC server and handlers
│   ├── utils/           # Utility functions and helpers
│   └── index.js         # Application entry point
├── shared-proto/        # Protocol buffer definitions
├── setup/              # Setup documentation
└── tests/              # Test files
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- Create an issue on GitHub
- Check the setup documentation in the `setup/` folder
- Review the configuration examples

## 🔄 Version History

- **v1.0.0**: Initial release with email, Google, and passwordless authentication
- Support for PostgreSQL, Redis, and Grafana Loki
- Comprehensive security features and device management

---

**Built with ❤️ using Node.js, TypeScript, and gRPC**
