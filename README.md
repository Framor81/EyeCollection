# Gaze Calibration Collector

A mobile-optimized web app for collecting eye gaze calibration data. Captures images of users looking in different directions and uploads them to Supabase Storage.

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