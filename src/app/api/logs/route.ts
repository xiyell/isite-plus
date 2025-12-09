import { NextResponse } from "next/server";

export async function GET() {
    // Mock logs for now
    return NextResponse.json([
        { id: "1", category: "system", action: "Build", severity: "low", message: "Build completed", time: "10:00 AM", timestamp: Date.now() }
    ]);
}
