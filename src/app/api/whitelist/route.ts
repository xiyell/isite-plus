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
    const { entries, actorName } = await req.json(); // Expected: { entries: [{ id: string, name: string }] }

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const db = getAdminDb();
    const batch = db.batch();
    const collectionRef = db.collection("allowed_student_ids");
    let count = 0;

    entries.forEach((entry: { id: string, name: string }) => {
      if (entry.id && typeof entry.id === 'string' && entry.id.trim().length > 0) {
        const docRef = collectionRef.doc(entry.id.trim());
        batch.set(docRef, { 
            name: entry.name?.trim() || "Unknown Name",
            createdAt: FieldValue.serverTimestamp(),
        });
        count++;
      }
    });

    if (count > 0) {
        await batch.commit();
        
        // Log Activity
        await db.collection("activitylogs").add({
            category: "users",
            action: "Whitelist Batch Add",
            severity: "medium",
            message: `Added ${count} students to whitelist.`,
            actorRole: "admin", 
            actorName: actorName || "Unknown Admin", 
            timestamp: FieldValue.serverTimestamp(),
            time: new Date().toLocaleString(),
        });
    }

    return NextResponse.json({ message: `Successfully whitelisted ${count} students` });
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return NextResponse.json({ error: "Failed to update whitelist" }, { status: 500 });
  }
}

// DELETE: Remove IDs
export async function DELETE(req: NextRequest) {
  try {
    const { studentIds, actorName } = await req.json();

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

    // Log Activity
    await db.collection("activitylogs").add({
        category: "users",
        action: "Whitelist Delete",
        severity: "medium",
        message: `Removed ${studentIds.length} students from whitelist: ${studentIds.join(', ')}`,
        actorRole: "admin",
        actorName: actorName || "Unknown Admin", 
        timestamp: FieldValue.serverTimestamp(),
        time: new Date().toLocaleString(),
    });

    return NextResponse.json({ message: `Successfully removed ${studentIds.length} IDs` });
  } catch (error) {
    console.error("Error removing from whitelist:", error);
    return NextResponse.json({ error: "Failed to remove IDs" }, { status: 500 });
  }
}

// PATCH: Update an entry (Edit ID or Name)
export async function PATCH(req: NextRequest) {
  try {
    const { oldStudentId, newStudentId, name, actorName } = await req.json();

    if (!oldStudentId) {
      return NextResponse.json({ error: "Original Student ID is required" }, { status: 400 });
    }

    const db = getAdminDb();
    const oldRef = db.collection("allowed_student_ids").doc(oldStudentId);

    // Case 1: ID Change (and potentially name change)
    if (newStudentId && newStudentId !== oldStudentId) {
        const newRef = db.collection("allowed_student_ids").doc(newStudentId);
        
        // Check conflicts
        const newSnap = await newRef.get();
        if (newSnap.exists) {
            return NextResponse.json({ error: "New Student ID already exists" }, { status: 409 });
        }
        
        const oldSnap = await oldRef.get();
        if (!oldSnap.exists) {
            return NextResponse.json({ error: "Original Student ID not found" }, { status: 404 });
        }

        const batch = db.batch();
        // Create new
        batch.set(newRef, {
            name: name?.trim() || oldSnap.data()?.name,
            createdAt: oldSnap.data()?.createdAt || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        // Delete old
        batch.delete(oldRef);
        await batch.commit();

        // Log Activity
        await db.collection("activitylogs").add({
            category: "users",
            action: "Whitelist Edit ID",
            severity: "high", // ID change is high severity
            message: `Renamed Student ID from "${oldStudentId}" to "${newStudentId}"`,
            actorRole: "admin",
            actorName: actorName || "Unknown Admin",
            timestamp: FieldValue.serverTimestamp(),
            time: new Date().toLocaleString(),
        });

    } else {
        // Case 2: Just Name Update
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        await oldRef.update({
            name: name.trim(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Log Activity
        await db.collection("activitylogs").add({
            category: "users",
            action: "Whitelist Edit Name",
            severity: "low",
            message: `Updated name for Student ID "${oldStudentId}" to "${name}"`,
            actorRole: "admin",
            actorName: actorName || "Unknown Admin",
            timestamp: FieldValue.serverTimestamp(),
            time: new Date().toLocaleString(),
        });
    }

    return NextResponse.json({ message: "Successfully updated entry" });
  } catch (error) {
    console.error("Error updating whitelist:", error);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}
