# Email PDF Ingestion App

A Next.js application that monitors email accounts and automatically downloads PDF attachments, storing them locally while maintaining email metadata in a database.

## Core Features

- Multi-provider email support:
  - IMAP (Gmail, Yahoo, etc.)
  - Gmail API (OAuth2)
  - Microsoft Outlook (Graph API)
- Automated PDF attachment processing
- Email metadata tracking
- Real-time monitoring dashboard
- Multiple email account management
- Secure OAuth2 integration

## Prerequisites

- Node.js >= 18
- PostgreSQL database
- Gmail API project (for Gmail integration)
- Microsoft Azure App Registration (for Outlook integration)

## Quick Start

1. Clone and install:
```bash
git clone <your-repo>
cd my-email-ingestion-app
npm install
```

2. Set up environment variables in `.env`:
```env
# Required Database Configuration
DATABASE_URL="postgresql://user:password@localhost:5432/email_ingestion"

# PDF Storage Configuration
PDF_STORAGE_PATH="./public/pdfs"

# IMAP Default Settings (for standard IMAP connections)
IMAP_HOST="imap.gmail.com"
IMAP_PORT="993"

# Gmail OAuth2 Credentials (required for Gmail API)
GMAIL_CLIENT_ID="your-client-id"
GMAIL_CLIENT_SECRET="your-client-secret"
GMAIL_REDIRECT_URI="http://localhost:3000/api/auth/gmail/callback"

# Microsoft Graph API Credentials (required for Outlook)
AZURE_TENANT_ID="your-tenant-id"
AZURE_CLIENT_ID="your-client-id"
AZURE_CLIENT_SECRET="your-client-secret"
OUTLOOK_REDIRECT_URI="http://localhost:3000/api/auth/outlook/callback"
```

3. Initialize the database:
```bash
npx prisma generate
npx prisma db push
```

4. Start development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## Environment Variables Explained

### Database Configuration
- `DATABASE_URL`: PostgreSQL connection string

### Storage Configuration
- `PDF_STORAGE_PATH`: Local path for storing PDF attachments (relative to project root)

### IMAP Settings
- `IMAP_HOST`: Default IMAP server host
- `IMAP_PORT`: Default IMAP server port (usually 993 for SSL)

### Gmail Configuration
- `GMAIL_CLIENT_ID`: OAuth2 client ID from Google Cloud Console
- `GMAIL_CLIENT_SECRET`: OAuth2 client secret
- `GMAIL_REDIRECT_URI`: OAuth2 callback URL (must match Google Cloud Console)

### Microsoft Graph API Configuration
- `AZURE_TENANT_ID`: Azure AD tenant ID
- `AZURE_CLIENT_ID`: Azure application (client) ID
- `AZURE_CLIENT_SECRET`: Azure client secret
- `OUTLOOK_REDIRECT_URI`: OAuth2 callback URL (must match Azure portal)

## Usage Guide

### Setting Up Email Accounts

1. Navigate to the homepage (http://localhost:3000)
2. Click "Add New Configuration"
3. Choose your email provider:

#### For IMAP:
- Enter email address
- Select "IMAP" as connection type
- Provide username and password
- Enter IMAP host (if different from default)

#### For Gmail:
- Enter Gmail address
- Select "GMAIL" as connection type
- Click "Authenticate with Gmail"
- Complete Google OAuth flow

#### For Outlook:
- Enter Outlook email
- Select "OUTLOOK" as connection type
- Click "Authenticate with Outlook"
- Complete Microsoft OAuth flow

### Using the Dashboard

1. Access dashboard at http://localhost:3000/dashboard
2. Monitor email processing:
   - View configured accounts
   - Check processing status
   - Access downloaded PDFs
   - Review email metadata

### Checking for New Emails

- Manual: Click "Check New Emails" in dashboard
- Per Account: Use "Check Inbox" button for specific accounts
- Automated: Set up cron job calling the API endpoint

## API Endpoints

- `POST /api/fetch-emails`: Check for new emails
- `GET /api/email-metadata`: Get processed email list
- `GET /api/pdfs`: List downloaded PDFs
- `GET /api/pdfs/[id]/download`: Download specific PDF

## Development Commands

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Build application
npm run build

# Start production server
npm start

# Update database schema
npx prisma db push

# Reset database
npx prisma db reset

# Generate Prisma client
npx prisma generate
```

## Common Issues & Solutions

### OAuth2 Authentication Fails
- Verify credentials in `.env`
- Confirm redirect URIs match exactly
- Check required API scopes are enabled

### Emails Not Being Fetched
- Verify IMAP settings for traditional email
- Confirm OAuth tokens are valid
- Check email account security settings

### PDFs Not Downloading
- Verify PDF_STORAGE_PATH is writable
- Check file permissions
- Confirm PDF attachment MIME types

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure database exists

## Production Deployment

1. Set up production database
2. Configure production environment variables
3. Build application: `npm run build`
4. Start server: `npm start`

For detailed deployment guides, see our deployment documentation.
