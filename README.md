# Email Ingestion Application

This application automatically downloads PDF attachments from configured email accounts.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set up your database:
```bash
npx prisma generate
npx prisma db push
```

3. Configure environment variables in `.env`:
- `DATABASE_URL`: Your PostgreSQL connection string
- `PDF_STORAGE_PATH`: Local path for storing PDFs (defaults to ./pdfs)

4. Start the development server:
```bash
npm run dev
```

5. Access the application at http://localhost:3000

## Project Structure

- `/src/app/page.tsx` - Main configuration UI
- `/src/components` - React components
- `/src/services` - Email ingestion logic
- `/prisma` - Database schema
- `/pdfs` - Downloaded PDF storage

## Environment Variables

Create a `.env` file with:
```
DATABASE_URL="postgresql://user:password@localhost:5432/email_ingestion_db"
PDF_STORAGE_PATH="./pdfs"
```

## Testing

1. Configure an email account in the UI
2. Send a test email with PDF attachment
3. The PDF will appear in the `pdfs` directory
4. Check the database for metadata
