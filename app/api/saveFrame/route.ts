import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Test endpoint
export async function GET() {
  return NextResponse.json({ 
    message: "API route is working",
    timestamp: new Date().toISOString()
  });
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const image = form.get("image") as Blob;
    const label = form.get("label") as string;

    console.log("Received upload request:", { 
      hasImage: !!image, 
      imageSize: image?.size, 
      label 
    });

    if (!image || !label) {
      console.error("Missing image or label:", { hasImage: !!image, label });
      return NextResponse.json(
        { error: "Missing image or label" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase config missing:", { 
        hasUrl: !!supabaseUrl, 
        hasKey: !!supabaseServiceKey 
      });
      return NextResponse.json(
        { error: "Supabase configuration missing" },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Use a default user ID for MVP (you can make this dynamic later)
    const userId = "user1";
    const timestamp = Date.now();
    const filename = `${userId}/${label}/${timestamp}.jpg`;

    console.log("Uploading to:", filename);

    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Buffer size:", buffer.length);

    const { data, error } = await supabase.storage
      .from("calibration")
      .upload(filename, buffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return NextResponse.json({ 
        error: error.message,
        details: error 
      }, { status: 500 });
    }

    console.log("Upload successful:", data);
    return NextResponse.json({ success: true, filename, data });
  } catch (error) {
    console.error("Error in saveFrame route:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

