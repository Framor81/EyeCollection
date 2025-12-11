# Gaze Calibration Collector

A mobile-optimized web app for collecting eye gaze calibration data. Captures images of users looking in different directions and uploads them to Supabase Storage.

## Features

- 📱 Mobile and desktop optimized
- 📸 Automatic image capture (2 frames per direction)
- ☁️ Supabase Storage integration
- 🎯 Six-direction calibration (up, down, left, right, straight, closed)
- 🌙 Dark mode UI

## Getting Started

### Prerequisites

- Node.js 18+ 
- Supabase account with a storage bucket named `calibration`

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_service_role_key
```

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Supabase Setup

1. Create a storage bucket named `calibration` in your Supabase dashboard
2. Set the bucket to public or configure appropriate policies
3. Add your Supabase URL and service role key to `.env`

## Deploy on Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. Push your code to GitHub:
```bash
git remote add origin <your-github-repo-url>
git push -u origin master
```

2. Go to [vercel.com](https://vercel.com) and sign in
3. Click "New Project"
4. Import your GitHub repository
5. Add environment variables:
   - `SUPABASE_URL` = your Supabase URL
   - `SUPABASE_SECRET_KEY` = your Supabase service role key
6. Click "Deploy"

### Option 2: Deploy via Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
vercel
```

3. Follow the prompts and add your environment variables when asked

### Environment Variables on Vercel

Make sure to add these in your Vercel project settings:
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`

## Project Structure

```
/app
  /api
    /saveFrame
      route.ts      → Image upload endpoint
  page.tsx          → Main calibration page
  layout.tsx        → Root layout
  globals.css       → Global styles

/lib
  supabase.ts       → Supabase client config
```

## License

MIT
