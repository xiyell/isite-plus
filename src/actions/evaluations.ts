"use server";

import { getAdminDb } from "@/services/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { Evaluation, EvaluationQuestion, EvaluationResponse } from "@/types/evaluation";
import { addLog } from "./logs";

const EVALUATIONS_COLLECTION = "evaluations";
const RESPONSES_COLLECTION = "evaluation_responses";

// --- Evaluations (Forms) ---

export async function getEvaluations(filter?: { status?: string }): Promise<Evaluation[]> {
    try {
        const adminDb = getAdminDb();
        let queryRef: FirebaseFirestore.Query = adminDb.collection(EVALUATIONS_COLLECTION);

        if (filter?.status) {
            queryRef = queryRef.where("status", "==", filter.status);
        } else {
            queryRef = queryRef.where("status", "!=", "deleted");
        }

        const snapshot = await queryRef.get();
        const results = snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            id: doc.id
        } as Evaluation));

        return results.sort((a, b) => {
            const dateA = a.createdAt || 0;
            const dateB = b.createdAt || 0;
            return dateB - dateA;
        });
    } catch (error) {
        console.error("Error fetching evaluations:", error);
        throw error;
    }
}

export async function getEvaluationById(id: string): Promise<Evaluation | null> {
    try {
        const adminDb = getAdminDb();
        const docSnap = await adminDb.collection(EVALUATIONS_COLLECTION).doc(id).get();

        if (docSnap.exists) {
            return { ...docSnap.data(), id: docSnap.id } as Evaluation;
        }
        return null;
    } catch (error) {
        console.error(`Error fetching evaluation ${id}:`, error);
        return null;
    }
}

export async function createEvaluation(data: Omit<Evaluation, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
        const { id, ...cleanData } = data as any; // Ensure we don't save the 'id' field if passed
        const adminDb = getAdminDb();
        const docRef = await adminDb.collection(EVALUATIONS_COLLECTION).add({
            ...cleanData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Error creating evaluation:", error);
        throw new Error("Failed to create evaluation");
    }
}

export async function updateEvaluation(id: string, data: Partial<Evaluation>): Promise<void> {
    try {
        const adminDb = getAdminDb();
        await adminDb.collection(EVALUATIONS_COLLECTION).doc(id).update({
            ...data,
            updatedAt: Date.now(),
        });
    } catch (error) {
        console.error("Error updating evaluation:", error);
        throw error;
    }
}

export async function deleteEvaluation(id: string, actorRole?: string, actorName?: string): Promise<void> {
    try {
        if (!id) throw new Error("No ID provided for deletion");

        console.log(`Attempting to delete evaluation: ${id}`);
        const adminDb = getAdminDb();
        const docRef = adminDb.collection(EVALUATIONS_COLLECTION).doc(id);

        // Verify doc exists first to give better error
        const docSnap = await docRef.get();
        if (!docSnap.exists) {
            console.error(`Evaluation ${id} not found.`);
            // We can either throw or just return success (idempotent)
            // Throwing lets the UI know something is wrong
            throw new Error("Evaluation not found");
        }

        // Soft delete: Update status to 'deleted'
        await docRef.update({
            isDeleted: true,
            status: 'deleted',
            deletedAt: Date.now(), // Use Date.now() for consistency and safety
        });
        console.log(`Evaluation ${id} marked as deleted.`);

        // Log action safely
        try {
            await addLog({
                category: "system",
                action: "DELETE_EVALUATION",
                severity: "medium",
                actorRole: actorRole || "admin",
                actorName: actorName,
                message: `Evaluation "${id}" was moved to trash bin by ${actorName || "an administrator"}`
            });
        } catch (logErr) {
            console.error("Failed to add log for evaluation deletion (non-critical):", logErr);
        }
    } catch (error: any) {
        console.error("Error deleting evaluation:", error);
        // Throw specific message if possible
        throw new Error(`Failed to delete evaluation: ${error.message}`);
    }
}

// --- Responses ---

export async function checkHasUserResponded(evaluationId: string, userId: string): Promise<boolean> {
    try {
        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection(RESPONSES_COLLECTION)
            .where("evaluationId", "==", evaluationId)
            .where("userId", "==", userId)
            .get();
        return !snapshot.empty;
    } catch (error) {
        console.error("Error checking response status:", error);
        return false; // Fail safe
    }
}

export async function submitEvaluationResponse(evaluationId: string, data: { userEmail: string; userId?: string; answers: any; userName?: string; studentId?: string; section?: string; yearLevel?: string }): Promise<string> {
    try {
        if (!data.userId) throw new Error("User ID is required");

        // 1. Check if already responded
        const hasResponded = await checkHasUserResponded(evaluationId, data.userId);
        if (hasResponded) {
            throw new Error("You have already submitted a response for this evaluation.");
        }

        // 2. Submit
        const adminDb = getAdminDb();
        const docRef = await adminDb.collection(RESPONSES_COLLECTION).add({
            evaluationId,
            ...data,
            submittedAt: Date.now(),
        });
        return docRef.id;
    } catch (error) {
        console.error("Error submitting response:", error);
        throw error;
    }
}

export async function getEvaluationResponses(evaluationId: string): Promise<EvaluationResponse[]> {
    try {
        const adminDb = getAdminDb();
        const snapshot = await adminDb.collection(RESPONSES_COLLECTION)
            .where("evaluationId", "==", evaluationId)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as EvaluationResponse));
    } catch (error) {
        console.error("Error fetching responses:", error);
        throw new Error("Failed to fetch responses");
    }
}
