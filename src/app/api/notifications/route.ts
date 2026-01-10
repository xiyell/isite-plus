import { NextResponse } from "next/server";

import { requireAuth } from "@/lib/auth-checks";

export async function GET() {
    try {
        await requireAuth();
        // Mock notifications for now
        return NextResponse.json([]);
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
}
