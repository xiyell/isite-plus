export type QuestionType = 'rating' | 'essay';

export interface EvaluationQuestion {
    id: string;
    type: QuestionType;
    text: string;
    required: boolean;
    minRating?: number;
    maxRating?: number;
}

export interface Evaluation {
    id: string;
    title: string;
    eventId?: string;
    eventName: string;
    description?: string;
    status: 'active' | 'closed' | 'draft' | 'deleted';
    questions: EvaluationQuestion[];
    createdAt: number; // Timestamp
    updatedAt: number; // Timestamp
    createdBy: string;
}

export interface EvaluationResponse {
    id: string;
    evaluationId: string;
    userId?: string;
    userEmail: string;
    answers: Record<string, string | number>; // questionId -> answer
    submittedAt: number; // Timestamp
    // Enhanced fields for reporting
    userName?: string;
    studentId?: string;
    section?: string;
    yearLevel?: string;
}
