import { NextResponse } from "next/server";
import { getAdminAuth } from "@/services/firebaseAdmin";

export async function POST(req: Request) {
    try {
        const { token } = await req.json();
        if (!token) return NextResponse.json({ admin: false });

        const decoded = await getAdminAuth().verifyIdToken(token);

        return NextResponse.json({
            admin: decoded.role === "admin",
        });
    } catch (e) {
        return NextResponse.json({ admin: false });
    }
}
