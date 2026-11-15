# Studyroom | غرفة الدراسة

A bilingual Next.js and React study chat. It supports Arabic right-to-left and English left-to-right layouts, conversation history, and attachments from slides, lecture notes, PDFs, and images.

## Run locally | التشغيل محليًا

Requires Node.js 20.9+ and npm. بعد فكّ ضغط الملف، افتح الطرفية في مجلد المشروع وشغّل:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Preview mode is available without credentials and includes a worked example. Conversations and sent files are kept in IndexedDB in the current browser. Clearing browser data removes them.

## Connect an AI backend | ربط الذكاء الاصطناعي

Copy `.env.example` to `.env.local` and set `STUDY_AI_URL` to your HTTPS backend endpoint and `STUDY_AI_KEY` to its bearer credential. Restart Next.js after changing environment variables. Configure `STUDY_SITE_ORIGIN` to your public origin if your reverse proxy rewrites the request URL.

The server route at `POST /api/chat` uses the following contract with your backend:

- Request method: POST with `Authorization: Bearer <STUDY_AI_KEY>`.
- Request body: `multipart/form-data` with the fields `language` (`ar` or `en`), `messages` (JSON array of `{ role, content }`), and repeated `files` parts containing the actual attachments for the conversation. Up to four files, 10 MiB combined.
- Successful response: HTTP 200 with JSON `{ "answer": "Your explanation" }`.

Your backend must handle extraction or model input for the supported document and image formats and return the answer. If your provider uses a different request format, adapt the forwarding code in `app/api/chat/route.js` or use a gateway that implements this contract. The AI key stays on the server. When connected, attachments are sent to your configured backend when a message is submitted.

## Production

```bash
npm run build
npm start
```

Deploy to a host that supports the Next.js Node.js runtime. Before opening a paid AI endpoint to students, configure sign-in or host-level access controls and rate limits. This project stores conversations on each device and does not include account sync.

## GitHub Pages

Build the static site into the repository's `docs/` folder. The example assumes the repository is named `studyroom`.

```bash
npm ci
PAGES_REPOSITORY=studyroom npm run build:pages
```

Commit the source and `docs/` (including `docs/.nojekyll`) to the default branch. In your repository, choose **Settings → Pages → Deploy from a branch**, then select **main** and **/docs**.

The Pages build runs in preview mode by default. To connect it to a backend later, set `NEXT_PUBLIC_STUDY_CHAT_URL` to the HTTPS URL of a separately hosted chat endpoint when building. The endpoint needs to accept the same multipart payload, return `{ "answer": "..." }`, and allow the Pages origin via CORS. Keep authentication for the AI provider and its keys on that backend.
