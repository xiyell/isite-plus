import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

// GET: Fetch all allowed IDs
export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("allowed_student_ids").get();
    
    // Return array of strings (scanner friendly)
    const ids = snapshot.docs.map(doc => doc.id);
    
    return NextResponse.json({ ids });
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json({ error: "Failed to fetch whitelist" }, { status: 500 });
  }
}

// POST: Add IDs (Bulk)
export async function POST(req: NextRequest) {
  try {
    const { studentIds } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const collectionRef = db.collection("allowed_student_ids");

    studentIds.forEach((id: string) => {
      if (typeof id === 'string' && id.trim().length > 0) {
        const docRef = collectionRef.doc(id.trim());
        batch.set(docRef, { 
            createdAt: FieldValue.serverTimestamp(),
            // We can add metadata here like "addedBy" if we want later
        });
      }
    });

    await batch.commit();

    return NextResponse.json({ message: `Successfully added ${studentIds.length} IDs` });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return NextResponse.json({ error: "Failed to update whitelist" }, { status: 500 });
  }
}

// DELETE: Remove IDs
export async function DELETE(req: NextRequest) {
  try {
    const { studentIds } = await req.json();

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const collectionRef = db.collection("allowed_student_ids");

    studentIds.forEach((id: string) => {
        const docRef = collectionRef.doc(id);
        batch.delete(docRef);
    });

    await batch.commit();

    return NextResponse.json({ message: `Successfully removed ${studentIds.length} IDs` });
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    return NextResponse.json({ error: "Failed to remove IDs" }, { status: 500 });
  }
}
