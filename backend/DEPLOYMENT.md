# Deployment Configuration

## Required Environment Variables

### GitHub Secrets (for CI/CD)

The following secrets need to be configured in your GitHub repository settings:

#### Existing Secrets
- `AWS_REGION`
- `ECR_REPOSITORY_NAME`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `LIGHTSAIL_SSH_KEY`
- `LIGHTSAIL_HOST`
- `MONGODB_URI`
- `JWT_SECRET`
- `JWT_EXPIRE`
- `AWS_S3_BUCKET_NAME`
- `FRONTEND_URL`
- `OPENAI_API_KEY`
- `ENCRYPTION_KEY`

#### New Email Secrets (Required)
- `EMAIL_HOST` - SMTP server host (e.g., `mail.aaccounting.me`)
- `EMAIL_PORT` - SMTP server port (e.g., `465`)
- `EMAIL_USER` - SMTP username (e.g., `it@aaccounting.me`)
- `EMAIL_PASS` - SMTP password
- `LOGIN_URL` - Login URL for employee credentials email (e.g., `https://erp.aaccounting.me`)

### Docker Compose

When using `docker-compose.yml`, ensure these environment variables are set in your `.env` file or passed to the container:

```env
EMAIL_HOST=mail.aaccounting.me
EMAIL_PORT=465
EMAIL_USER=it@aaccounting.me
EMAIL_PASS=your-email-password
LOGIN_URL=https://erp.aaccounting.me
```

### Local Development

Create a `.env` file in the `backend` directory with all required variables. See `README.md` for the complete list.

## Setting Up GitHub Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each of the email-related secrets listed above

## Docker Deployment

The Docker container will automatically use environment variables passed at runtime. The CI/CD workflow passes these from GitHub secrets to the container.

## Verification

After deployment, verify email configuration by:
1. Checking container logs: `docker logs accounting-backend`
2. Looking for: "Email server is ready to send messages"
3. Testing with the credentials script: `node scripts/sendEmployeeCredentials.js <test-email>`

