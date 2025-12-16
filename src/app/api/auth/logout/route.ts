import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const cookieStore = await cookies();

        // Delete secure session and UI role cookies
        cookieStore.delete("session");
        cookieStore.delete("ui_role");

        // Cleanup lagacy cookies
        cookieStore.delete("admin");
        cookieStore.delete("userRole");

        console.log("Server-side logout successful: Cookies deleted.");
        return NextResponse.json({ success: true, message: "Logged out successfully" });
    } catch (error) {
        console.error("Server-side Logout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
