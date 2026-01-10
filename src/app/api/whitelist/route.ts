import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export const dynamic = 'force-dynamic';

// GET: Fetch all allowed IDs with names
export async function GET(req: NextRequest) {
  try {
    const db = getAdminDb();
    const snapshot = await db.collection("allowed_student_ids").get();
    
    // Return array of objects { id, name }
    const entries = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name || "Unknown Name"
    }));
    
    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Error fetching whitelist:", error);
    return NextResponse.json({ error: "Failed to fetch whitelist" }, { status: 500 });
  }
}

// POST: Add Entries (Bulk)
export async function POST(req: NextRequest) {
  try {
    const { entries } = await req.json(); // Expected: { entries: [{ id: string, name: string }] }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const collectionRef = db.collection("allowed_student_ids");

    entries.forEach((entry: { id: string, name: string }) => {
      if (entry.id && typeof entry.id === 'string' && entry.id.trim().length > 0) {
        const docRef = collectionRef.doc(entry.id.trim());
        batch.set(docRef, { 
            name: entry.name?.trim() || "Unknown Name",
            createdAt: FieldValue.serverTimestamp(),
        });
      }
    });

    await batch.commit();

    return NextResponse.json({ message: `Successfully whitelisted ${entries.length} students` });
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

// PATCH: Update an entry (e.g., change name)
export async function PATCH(req: NextRequest) {
  try {
    const { studentId, name } = await req.json();

    if (!studentId || !name) {
      return NextResponse.json({ error: "Student ID and Name are required" }, { status: 400 });
    }

    const db = getAdminDb();
    await db.collection("allowed_student_ids").doc(studentId).update({
      name: name.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ message: "Successfully updated entry" });
  } catch (error) {
    console.error("Error updating whitelist:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
