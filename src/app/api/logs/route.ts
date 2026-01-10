import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

import { requireModerator } from "@/lib/auth-checks";

export async function GET() {
    try {
        await requireModerator();
        // Mock logs for now
        return NextResponse.json([
            { id: "1", category: "system", action: "Build", severity: "low", message: "Build completed", time: "10:00 AM", timestamp: Date.now() }
        ]);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
}
