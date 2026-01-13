"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Save, ArrowLeft, CheckCircle, FileText, BarChart2, Send, MoreVertical, Calendar } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import { Evaluation, EvaluationQuestion, EvaluationResponse } from "@/types/evaluation";
import { createEvaluation, getEvaluations, updateEvaluation, deleteEvaluation, submitEvaluationResponse, getEvaluationResponses, getEvaluationById } from "@/actions/evaluations";
import { auth, db } from "@/services/firebase";
import { doc, getDoc } from "firebase/firestore";

// --- Utility Components ---

const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
    </div>
);

// --- Main Component ---

export default function IEvaluationContent({ publicOnly = false }: { publicOnly?: boolean }) {
    const { toast } = useToast();
    const [view, setView] = useState<'list' | 'create' | 'edit' | 'stats' | 'respond'>('list');
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [selectedEvaluation, setSelectedEvaluation] = useState<Evaluation | null>(null);
    const [loading, setLoading] = useState(true); // Start loading immediately
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; id: string | null; }>({ isOpen: false, id: null });

    // Auth State
    const [user, setUser] = useState<any>(null); // Track user object
    const [isAdmin, setIsAdmin] = useState(false);
    const [authInitialized, setAuthInitialized] = useState(false);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                if (publicOnly) {
                    console.log("IEvaluation: Public mode forced.");
                    setIsAdmin(false);
                } else {
                    // Fetch user role from Firestore "users" collection
                    try {
                        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                        if (userDoc.exists()) {
                            const role = userDoc.data().role;
                            console.log(`IEvaluation: User role is '${role}'`);
                            setIsAdmin(role === 'admin' || role === 'superadmin');
                        } else {
                            console.log("IEvaluation: User document not found.");
                        }
                    } catch (e) {
                        console.error("Error fetching role:", e);
                    }
                }
            } else {
                setIsAdmin(false);
            }
            setAuthInitialized(true);
        });
        return () => unsubscribe();
    }, [publicOnly]);

    useEffect(() => {
        if (authInitialized) {
            if (user) {
                loadEvaluations();
            } else {
                setLoading(false); // Stop loading if not logged in
            }
        }
    }, [authInitialized, user, isAdmin]);

    const loadEvaluations = async () => {
        setLoading(true);
        try {
            const filter = isAdmin ? undefined : { status: 'active' };
            const data = await getEvaluations(filter);
            // Even admins should not see "deleted" items in the main list
            const activeItems = data.filter((e: Evaluation) => e.status !== 'deleted');
            setEvaluations(activeItems);
        } catch (error) {
            console.error("Failed to load evaluations", error);
        } finally {
            setLoading(false);
        }
    };

    if (authInitialized && !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                <div className="bg-white/10 p-6 rounded-full">
                    <FileText className="h-12 w-12 text-gray-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Login Required</h2>
                <p className="text-gray-400 max-w-md">
                    Please log in to view and participate in evaluations.
                </p>
                {/* Modals are handled in Navbar, user just needs to use them */}
            </div>
        );
    }

    const handleCreateClick = () => {
        setSelectedEvaluation({
            id: '',
            title: '',
            eventName: '',
            description: '',
            status: 'draft',
            questions: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            createdBy: auth.currentUser?.uid || 'system'
        });
        setView('create');
    };

    const handleEditClick = (evaluation: Evaluation) => {
        setSelectedEvaluation(evaluation);
        setView('edit');
    };

    const executeDelete = async () => {
        if (!confirmState.id) return;
        setIsDeleting(true);
        try {
            console.log("IEvaluation: Executing delete for ID:", confirmState.id);
            await deleteEvaluation(
                confirmState.id,
                isAdmin ? 'admin' : 'user',
                user?.displayName || user?.email || 'Unknown User'
            );
            toast({
                title: "Deleted",
                description: "Evaluation moved to trash successfully.",
                className: "bg-green-600 border-green-500 text-white"
            });
            await loadEvaluations();
        } catch (e) {
            console.error("Delete failed", e);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to delete evaluation."
            });
        } finally {
            setIsDeleting(false);
            setConfirmState({ isOpen: false, id: null });
        }
    };

    const handleDeleteClick = (id: string) => {
        setConfirmState({ isOpen: true, id });
    };

    const handleRespondClick = (evaluation: Evaluation) => {
        setSelectedEvaluation(evaluation);
        setView('respond');
    };

    const handleStatsClick = (evaluation: Evaluation) => {
        setSelectedEvaluation(evaluation);
        setView('stats');
    };

    const handleBack = () => {
        setView('list');
        setSelectedEvaluation(null);
        loadEvaluations(); // Refresh
    };

    return (
        <div className="space-y-6">
            <AnimatePresence mode="wait">
                {view === 'list' && (
                    <EvaluationList
                        key="list"
                        evaluations={evaluations}
                        loading={loading}
                        isAdmin={isAdmin}
                        onCreate={handleCreateClick}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        onRespond={handleRespondClick}
                        onStats={handleStatsClick}
                    />
                )}
                {(view === 'create' || view === 'edit') && selectedEvaluation && (
                    <EvaluationBuilder
                        key={selectedEvaluation?.id || 'new'}
                        initialData={selectedEvaluation}
                        mode={view}
                        onSave={async (data: Evaluation) => {
                            try {
                                if (view === 'create') {
                                    await createEvaluation(data);
                                    toast({
                                        title: "Evaluation created! 🎉",
                                        description: "Your new evaluation form is ready.",
                                    });
                                } else {
                                    // Use data.id from the form payload, it's safer
                                    const idToUpdate = data.id || selectedEvaluation?.id;

                                    if (!idToUpdate) {
                                        console.error("Context:", { data, selectedEvaluation });
                                        throw new Error("Critical: Missing Evaluation ID. Cannot save.");
                                    }

                                    await updateEvaluation(idToUpdate, data);
                                    toast({
                                        title: "Evaluation updated",
                                        description: `Status: ${data.status}`,
                                    });
                                }
                                handleBack();
                            } catch (error: any) {
                                console.error("Save failed:", error);
                                toast({
                                    variant: "destructive",
                                    title: "Error saving evaluation",
                                    description: error.message || "Something went wrong.",
                                });
                            }
                        }}
                        onCancel={handleBack}
                    />
                )}
                {view === 'respond' && selectedEvaluation && (
                    <EvaluationResponder
                        key="responder"
                        evaluation={selectedEvaluation}
                        userEmail={auth.currentUser?.email}
                        onSubmit={async (answers: Record<string, any>) => {
                            try {
                                // Fetch latest user profile to get Section/ID/Year
                                let userDetails = {};
                                if (auth.currentUser?.uid) {
                                    try {
                                        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                                        if (userDoc.exists()) {
                                            const u = userDoc.data();
                                            userDetails = {
                                                userName: u.name || auth.currentUser.displayName || 'Unknown',
                                                studentId: u.studentId || 'N/A',
                                                section: u.section || 'N/A',
                                                yearLevel: u.yearLevel || 'N/A'
                                            };
                                        }
                                    } catch (fetchError) {
                                        console.warn("Could not fetch user details (likely permission issue):", fetchError);
                                        // Fallback to basic info if we can't read the full profile
                                        userDetails = {
                                            userName: auth.currentUser.displayName || 'Unknown',
                                        };
                                    }
                                }

                                await submitEvaluationResponse(selectedEvaluation.id, {
                                    userEmail: auth.currentUser?.email || 'Unknown',
                                    userId: auth.currentUser?.uid,
                                    answers,
                                    ...userDetails
                                });
                                toast({
                                    title: "Submitted! 🚀",
                                    description: "Thank you for your feedback.",
                                });
                                handleBack();
                            } catch (error: any) {
                                toast({
                                    variant: "destructive",
                                    title: "Submission Failed",
                                    description: error.message || "Could not save your response.",
                                });
                            }
                        }}
                        onCancel={handleBack}
                    />
                )}
                {view === 'stats' && selectedEvaluation && (
                    <EvaluationStats
                        key="stats"
                        evaluation={selectedEvaluation}
                        onBack={handleBack}
                    />
                )}
            </AnimatePresence>
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                onClose={() => setConfirmState({ isOpen: false, id: null })}
                onConfirm={executeDelete}
                isLoading={isDeleting}
                title="Delete Evaluation?"
                description="Are you sure you want to delete this evaluation? It will be moved to the Trash Bin."
                confirmText="Yes, delete it"
            />
        </div>
    );
}

// --- Sub-Components ---

function EvaluationList({ evaluations, loading, onCreate, onEdit, onDelete, onRespond, onStats, isAdmin }: any) {
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Evaluations</h2>
                    <p className="text-gray-400">Manage and take event evaluations</p>
                </div>
                {isAdmin && (
                    <Button onClick={onCreate} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
                        <Plus className="mr-2 h-4 w-4" /> Create New
                    </Button>
                )}
            </div>

            {loading ? <LoadingSpinner /> : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {evaluations
                            .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                            .map((evaluation: Evaluation, index: number) => (
                                // Use fallback key to prevent "two children with same key" error if IDs are missing/dup
                                <Card key={evaluation.id || `eval-${index}`} className="bg-white/5 border-white/10 backdrop-blur-md hover:bg-white/10 transition-all">
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <Badge variant={evaluation.status === 'active' ? 'default' : 'secondary'} className={evaluation.status === 'active' ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' : 'bg-gray-500/20 text-gray-400'}>
                                                {evaluation.status}
                                            </Badge>
                                            {isAdmin && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent className="bg-gray-900 border-gray-800 text-white">
                                                        <DropdownMenuItem onClick={() => onEdit(evaluation)}>Edit</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => onStats(evaluation)}>View Responses</DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => onDelete(evaluation.id)} className="text-red-400">Delete</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                        <div className="mt-2 pr-2">
                                            <CardTitle className="text-xl text-white break-all whitespace-normal leading-tight">{evaluation.title}</CardTitle>
                                        </div>
                                        <CardDescription className="text-gray-400 flex items-center gap-1 mt-2 min-w-0">
                                            <Calendar className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate flex-1">{evaluation.eventName}</span>
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <p className="text-gray-300 text-sm line-clamp-3 break-all whitespace-normal">{evaluation.description || "No description provided."}</p>
                                    </CardContent>
                                    <CardFooter>
                                        <Button onClick={() => onRespond(evaluation)} className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                                            Take Evaluation
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        {evaluations.length === 0 && (
                            <div className="col-span-full text-center py-10 text-gray-500">
                                <p>No active evaluations found.</p>
                                {!isAdmin && <p className="text-xs mt-2 text-gray-600">Please ask an administrator to set an evaluation to "Active".</p>}
                            </div>
                        )}
                    </div>

                    {/* Pagination Controls */}
                    {evaluations.length > ITEMS_PER_PAGE && (
                        <div className="mt-6">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                        <PaginationPrevious
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (currentPage > 1) setCurrentPage(p => p - 1);
                                            }}
                                            className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                                        />
                                    </PaginationItem>
                                    {Array.from({ length: Math.ceil(evaluations.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setCurrentPage(page);
                                                }}
                                                isActive={page === currentPage}
                                                className={page === currentPage
                                                    ? "bg-fuchsia-600 text-white border-fuchsia-500"
                                                    : "text-gray-400 hover:text-white"
                                                }
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    <PaginationItem>
                                        <PaginationNext
                                            href="#"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (currentPage < Math.ceil(evaluations.length / ITEMS_PER_PAGE)) setCurrentPage(p => p + 1);
                                            }}
                                            className={currentPage === Math.ceil(evaluations.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                                        />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    )}
                </>
            )}
        </motion.div>
    );
}

function EvaluationBuilder({ initialData, mode, onSave, onCancel }: any) {
    // Ensure ID is completely preserved from initialData
    console.log("EvaluationBuilder mounted. Mode:", mode, "ID:", initialData?.id);

    const [formData, setFormData] = useState<Evaluation>({
        ...initialData,
        id: initialData?.id || '', // Explicitly keep the ID
    });

    // ... (rest of Builder)

    const addQuestion = () => {
        const newQuestion: EvaluationQuestion = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'rating',
            text: '',
            required: true,
            minRating: 1,
            maxRating: 5
        };
        setFormData({ ...formData, questions: [...formData.questions, newQuestion] });
    };

    const updateQuestion = (index: number, field: keyof EvaluationQuestion, value: any) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index] = { ...updatedQuestions[index], [field]: value };
        setFormData({ ...formData, questions: updatedQuestions });
    };

    const removeQuestion = (index: number) => {
        const updatedQuestions = formData.questions.filter((_, i) => i !== index);
        setFormData({ ...formData, questions: updatedQuestions });
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={onCancel} className="text-white hover:bg-white/10"><ArrowLeft /></Button>
                <h2 className="text-2xl font-bold text-white">{mode === 'create' ? 'Create Evaluation' : 'Edit Evaluation'} ({formData.id})</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Col: Settings */}
                <Card className="bg-white/5 border-white/10 backdrop-blur-xl h-fit">
                    <CardHeader><CardTitle className="text-white">Settings</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-white">Title</Label>
                            <Input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="bg-white/10 border-white/20 text-white mt-1"
                                placeholder="e.g. Weekly Meeting Feedback"
                            />
                        </div>
                        <div>
                            <Label className="text-white">Event Name</Label>
                            <Input
                                value={formData.eventName}
                                onChange={e => setFormData({ ...formData, eventName: e.target.value })}
                                className="bg-white/10 border-white/20 text-white mt-1"
                                placeholder="Linked Event"
                            />
                        </div>
                        <div>
                            <Label className="text-white">Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="bg-white/10 border-white/20 text-white mt-1"
                                placeholder="Instructions for users..."
                            />
                        </div>
                        <div>
                            <Label className="text-white">Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(val: 'draft' | 'active' | 'closed') => setFormData({ ...formData, status: val })}
                            >
                                <SelectTrigger className="bg-white/10 border-white/20 text-white mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                                    <SelectItem value="draft" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Draft</SelectItem>
                                    <SelectItem value="active" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Active</SelectItem>
                                    <SelectItem value="closed" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* Right Col: Questions */}
                <div className="lg:col-span-2 space-y-4">
                    {formData.questions.map((q, idx) => (
                        <Card key={q.id} className="bg-white/5 border-white/10 relative group">
                            <CardContent className="p-4 space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <div className="flex-grow space-y-2">
                                        <Input
                                            value={q.text}
                                            onChange={e => updateQuestion(idx, 'text', e.target.value)}
                                            className="bg-transparent border-0 border-b border-white/20 rounded-none text-lg font-medium text-white px-0 focus-visible:ring-0 focus-visible:border-fuchsia-500"
                                            placeholder="Question Text..."
                                        />
                                        <div className="flex gap-4 items-center">
                                            <Select value={q.type} onValueChange={(val) => updateQuestion(idx, 'type', val)}>
                                                <SelectTrigger className="w-[140px] h-8 bg-white/5 border-white/10 text-gray-300">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
                                                    <SelectItem value="rating" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Star Rating</SelectItem>
                                                    <SelectItem value="essay" className="focus:bg-zinc-800 focus:text-white cursor-pointer py-3 border-b border-white/5 last:border-0">Essay/Text</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id={`req-${q.id}`}
                                                    checked={q.required}
                                                    onCheckedChange={(checked) => updateQuestion(idx, 'required', checked)}
                                                    className="data-[state=checked]:bg-fuchsia-600"
                                                />
                                                <Label htmlFor={`req-${q.id}`} className="text-sm text-gray-400">Required</Label>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => removeQuestion(idx)} className="text-gray-500 hover:text-red-400 hover:bg-transparent">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <Button onClick={addQuestion} variant="outline" className="w-full border-dashed border-white/20 text-gray-400 hover:bg-white/5 hover:text-white">
                        <Plus className="mr-2 h-4 w-4" /> Add Question
                    </Button>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-white/10">
                        <Button variant="ghost" onClick={onCancel} className="text-gray-300 hover:bg-white/10">Cancel</Button>
                        <Button onClick={() => onSave(formData)} className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:opacity-90">
                            <Save className="mr-2 h-4 w-4" /> Save Evaluation
                        </Button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// Import checkHasUserResponded to use in Responder
import { checkHasUserResponded } from "@/actions/evaluations";

function EvaluationResponder({ evaluation, userEmail, onSubmit, onCancel }: any) {
    const { toast } = useToast();
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [submitting, setSubmitting] = useState(false);
    const [hasResponded, setHasResponded] = useState(false);
    const [checking, setChecking] = useState(true);
    const [confirmOpen, setConfirmOpen] = useState(false);

    useEffect(() => {
        const check = async () => {
            if (auth.currentUser?.uid) {
                const responded = await checkHasUserResponded(evaluation.id, auth.currentUser.uid);
                setHasResponded(responded);
            }
            setChecking(false);
        };
        check();
    }, [evaluation.id]);

    const handleSubmit = async () => {
        if (hasResponded) {
            toast({
                title: "Already Submitted",
                description: "You have already provided feedback for this event.",
                variant: "destructive"
            });
            return;
        }

        // Validate required fields
        for (const q of evaluation.questions) {
            if (q.required && !answers[q.id]) {
                toast({
                    title: "Missing Answer",
                    description: `Please answer: ${q.text}`,
                    variant: "destructive"
                });
                return;
            }
        }
        // Validation Passed: Ask for Confirmation
        setConfirmOpen(true);
    };

    const executeSubmit = async () => {
        setSubmitting(true);
        await onSubmit(answers);
        setSubmitting(false);
        setConfirmOpen(false);
    };

    if (checking) return <LoadingSpinner />;

    if (hasResponded) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white/5 rounded-xl border border-white/10 backdrop-blur-xl max-w-lg mx-auto mt-10">
                <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
                <p className="text-gray-400 text-center mb-6">You have already submitted your response for this evaluation.</p>
                <Button 
                    onClick={onCancel} 
                    className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-fuchsia-900/20 px-8 rounded-full"
                >
                    Back to List
                </Button>
            </div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="group flex items-center gap-2 text-gray-400 hover:text-white hover:bg-white/10 transition-all rounded-full px-4 pl-3"
                >
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Back to List
                </Button>
            </div>

            <Card className="bg-white/5 border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden relative">
                {/* Gentle Top Gradient */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-fuchsia-600 to-purple-600" />

                <CardHeader className="text-center pt-8 pb-8 space-y-4 border-b border-white/5">
                    <CardTitle className="text-3xl font-bold text-white tracking-tight break-words">{evaluation.title}</CardTitle>
                    <CardDescription className="text-gray-300 text-lg max-w-2xl mx-auto break-words whitespace-normal">{evaluation.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-8 pt-8 px-6 md:px-10">
                    {evaluation.questions.map((q: EvaluationQuestion) => (
                        <div key={q.id} className="space-y-3">
                            <Label className="text-lg text-white font-medium flex gap-2 items-center">
                                <span className={q.required ? "text-white" : "text-gray-300"}>{q.text}</span>
                                {q.required && <Badge variant="secondary" className="bg-fuchsia-900/30 text-fuchsia-300 text-[10px] px-1.5 py-0 h-5">Required</Badge>}
                            </Label>

                            {q.type === 'rating' ? (
                                <div className="flex gap-2 justify-start mb-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setAnswers({ ...answers, [q.id]: star })}
                                            className={`transition-all duration-200 transform hover:scale-110 focus:outline-none p-1 ${(answers[q.id] || 0) >= star
                                                ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                                                : 'text-white/20 hover:text-yellow-200/50'
                                                }`}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 md:w-12 md:h-12">
                                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <Textarea
                                    value={answers[q.id] || ''}
                                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                                    className="bg-black/20 border-white/10 text-white min-h-[120px] text-base p-4 focus:border-fuchsia-500/50 focus:ring-fuchsia-500/20 rounded-xl resize-none"
                                    placeholder="Type your answer here..."
                                />
                            )}
                            <div className="h-px bg-white/5 w-full mt-6" />
                        </div>
                    ))}
                </CardContent>

                <CardFooter className="flex justify-between items-center gap-4 border-t border-white/5 bg-black/20 p-6 md:px-10">
                    <Button variant="ghost" onClick={onCancel} className="text-gray-400 hover:text-white hover:bg-white/5">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        size="lg"
                        className="bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white hover:opacity-90 shadow-lg shadow-fuchsia-900/20 px-8 rounded-full"
                    >
                        {submitting ? 'Submitting...' : 'Submit Evaluation'}
                    </Button>
                </CardFooter>
            </Card>

            <ConfirmDialog
                isOpen={confirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={executeSubmit}
                isLoading={submitting}
                title="Submit Evaluation?"
                description="Are you sure you want to submit your responses? You cannot edit them afterwards."
                confirmText="Yes, Submit"
            />
        </motion.div>
    );
}


import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";

function EvaluationStats({ evaluation, onBack }: any) {
    const [responses, setResponses] = useState<EvaluationResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        getEvaluationResponses(evaluation.id).then(data => {
            setResponses(data);
            setLoading(false);
        });
    }, [evaluation.id]);

    const filteredResponses = responses.filter(r =>
        r.userEmail.toLowerCase().includes(filterText.toLowerCase()) ||
        r.studentId?.toLowerCase().includes(filterText.toLowerCase()) ||
        r.section?.toLowerCase().includes(filterText.toLowerCase()) ||
        r.userName?.toLowerCase().includes(filterText.toLowerCase()) ||
        r.yearLevel?.toLowerCase().includes(filterText.toLowerCase())
    );

    // Reset page to 1 on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [filterText]);

    // Calculate stats for charts
    const getChartData = (questionId: string) => {
        const counts: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        responses.forEach(r => {
            const answer = r.answers[questionId];
            if (typeof answer === 'number') {
                counts[answer.toString()] = (counts[answer.toString()] || 0) + 1;
            }
        });
        return Object.entries(counts).map(([name, value]) => ({ name: `${name} Stars`, value }));
    };

    return (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/10"><ArrowLeft /></Button>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Responses: {evaluation.title}</h2>
                        <p className="text-gray-400">Total Responses: {responses.length}</p>
                    </div>
                </div>
            </div>

            {loading ? <LoadingSpinner /> : (
                <div className="space-y-8">
                    {/* Charts Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {evaluation.questions.filter((q: EvaluationQuestion) => q.type === 'rating').map((q: EvaluationQuestion) => (
                            <Card key={q.id} className="bg-white/5 border-white/10 backdrop-blur-xl">
                                <CardHeader>
                                    <CardTitle className="text-lg text-white">{q.text}</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getChartData(q.id)}>
                                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            />
                                            <Bar dataKey="value" fill="#d946ef" radius={[4, 4, 0, 0]}>
                                                {getChartData(q.id).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'][index] || '#d946ef'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Table Section */}
                    <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden">
                        <CardHeader><CardTitle className="text-white">Individual Responses</CardTitle></CardHeader>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-black/20">
                                    <TableRow className="border-white/10 hover:bg-transparent">
                                        <TableHead className="text-gray-300">Name</TableHead>
                                        <TableHead className="text-gray-300">ID / Year & Section</TableHead>
                                        <TableHead className="text-gray-300">Date</TableHead>
                                        {evaluation.questions.map((q: EvaluationQuestion) => (
                                            <TableHead key={q.id} className="text-gray-300 min-w-[150px]">{q.text}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredResponses
                                        .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                        .map((r) => {
                                            const section = r.section || '';
                                            const sectionDisplay = ['1', '2', '3', '4'].includes(section) ? `Section ${section}` : (section || '-');
                                            const fullDisplay = r.yearLevel ? `${r.yearLevel} - ${sectionDisplay}` : sectionDisplay;

                                            return (
                                                <TableRow key={r.id} className="border-white/10 hover:bg-white/5">
                                                    <TableCell className="font-medium text-white">
                                                        <div>{r.userName || 'Unknown'}</div>
                                                        <div className="text-xs text-gray-500">{r.userEmail}</div>
                                                    </TableCell>
                                                    <TableCell className="text-gray-400">
                                                        <span className="block text-white">{r.studentId || '-'}</span>
                                                        <span className="text-xs text-blue-200">{fullDisplay}</span>
                                                    </TableCell>
                                                    <TableCell className="text-gray-400">
                                                        {new Date(r.submittedAt).toLocaleDateString()}
                                                    </TableCell>
                                                    {evaluation.questions.map((q: EvaluationQuestion) => (
                                                        <TableCell key={q.id} className="text-gray-300">
                                                            {r.answers[q.id]}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            );
                                        })}
                                    {responses.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={evaluation.questions.length + 2} className="text-center py-8 text-gray-500">
                                                No responses yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination Controls */}
                        {filteredResponses.length > ITEMS_PER_PAGE && (
                            <div className="p-4 border-t border-white/10">
                                <Pagination>
                                    <PaginationContent>
                                        <PaginationItem>
                                            <PaginationPrevious
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (currentPage > 1) setCurrentPage(p => p - 1);
                                                }}
                                                className={currentPage === 1 ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                                            />
                                        </PaginationItem>
                                        {Array.from({ length: Math.ceil(filteredResponses.length / ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
                                            <PaginationItem key={page}>
                                                <PaginationLink
                                                    href="#"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setCurrentPage(page);
                                                    }}
                                                    isActive={page === currentPage}
                                                    className={page === currentPage
                                                        ? "bg-fuchsia-600 text-white border-fuchsia-500"
                                                        : "text-gray-400 hover:text-white"
                                                    }
                                                >
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        <PaginationItem>
                                            <PaginationNext
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    if (currentPage < Math.ceil(filteredResponses.length / ITEMS_PER_PAGE)) setCurrentPage(p => p + 1);
                                                }}
                                                className={currentPage === Math.ceil(filteredResponses.length / ITEMS_PER_PAGE) ? "pointer-events-none opacity-50 text-gray-400" : "text-gray-300 hover:text-white"}
                                            />
                                        </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                    </Card>
                </div>
            )}
        </motion.div>
    );
}

