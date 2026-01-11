import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
    try {
        const response = NextResponse.json({ 
            success: true, 
            message: "Logged out successfully" 
        });

        // Delete cookies explicitly on the response object
        response.cookies.delete("session");
        response.cookies.delete("ui_role");
        
        // Legacy cleanup
        response.cookies.delete("admin");
        response.cookies.delete("userRole");

        console.log("✅ Server-side logout successful: Cookies cleared via NextResponse.");
        return response;
    } catch (error) {
        console.error("Server-side Logout error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
