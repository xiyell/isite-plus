import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const { studentId } = await req.json();

    if (!studentId || typeof studentId !== 'string') {
      return NextResponse.json({ allowed: false, error: "Invalid ID format" }, { status: 400 });
    }

    const db = getAdminDb();
    const docRef = db.collection("allowed_student_ids").doc(studentId);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
        return NextResponse.json({ 
          allowed: true, 
          name: docSnap.data()?.name || "Unknown Name" 
        });
    } else {
        return NextResponse.json({ allowed: false });
    }

  } catch (error) {
    console.error("Error checking whitelist:", error);
    return NextResponse.json({ allowed: false, error: "Server error" }, { status: 500 });
  }
}
