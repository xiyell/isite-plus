import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const db = getAdminDb();
        await db.collection("users").doc(id).set(body, { merge: true });
        return NextResponse.json({ message: "User updated" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const db = getAdminDb();
        await db.collection("users").doc(id).update(body);
        return NextResponse.json({ message: "User updated" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const db = getAdminDb();
        await db.collection("users").doc(id).delete();
        return NextResponse.json({ message: "User deleted" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
