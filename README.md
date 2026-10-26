# RAG Document Assistant

A React, Vite, and TypeScript frontend for uploading text-based PDFs and asking
questions grounded in their contents.

## Local development

```sh
npm install
cp .env.example .env.local
npm run dev
```

Set `VITE_API_BASE_URL` in `.env.local` to the backend API URL. The example file
uses the deployed Render API:

```dotenv
VITE_API_BASE_URL=https://rag1-rvcb.onrender.com
```

The frontend sends PDF uploads to `POST /upload` as multipart form data in the
`file` field, and questions to `POST /ask` as JSON with `question` and
`document_id`.

## Vercel

Import this repository in Vercel with the project root set to the repository
root. Use `npm run build` as the build command and `dist` as the output
directory. Add `VITE_API_BASE_URL` to the Vercel project's environment
variables, using `https://rag1-rvcb.onrender.com` as its value, then build and
deploy. This variable is a public API URL, not a secret.
