"use client";

import { useReducer, useEffect, useState } from "react";
// Import Firebase modules and singleton pattern utilities
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, Auth } from 'firebase/auth';
import { getFirestore, collection, addDoc, setLogLevel, Firestore } from 'firebase/firestore';

// We replace @heroui imports with standard HTML elements and Tailwind styling.
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertCircle, XCircle, Loader } from "lucide-react"; // Added Loader icon

// --- Configuration & Constants ---
const FEEDBACK_TYPES = ["Feedback", "Bug Report", "Suggestion"];

// Initialize global variables (MANDATORY)
// NOTE: These variables must be correctly defined in your environment/build process
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// --- Singleton Firebase Initialization (Applied User's Pattern) ---
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (firebaseConfig && Object.keys(firebaseConfig).length > 0) {
  // Use getApps() for singleton check
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = getFirestore(app);
  // setLogLevel('debug'); // Enable detailed Firebase logging (Commented out for production readiness)
} else {
  console.error("Firebase configuration is missing. Cannot initialize Firebase.");
}


// --- Custom Components for Readability & Reusability ---

/**
 * Reusable styled Input/Textarea component with Tailwind styling.
 * Apply Glassmorphism: BG opacity, border, and backdrop-blur.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StyledInput = ({ label, placeholder, value, onChange, isTextarea = false, ...props }: { label?: string, placeholder?: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void, isTextarea?: boolean, [key: string]: any }) => {
  // Purplish/Glassy input classes
  const inputClasses = [
    "w-full p-3 rounded-xl",
    "bg-white/10 border border-purple-200/30 text-white placeholder-purple-200/70",
    "focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400",
    "backdrop-blur-sm shadow-inner", // Key for Glassmorphism
    "transition-all duration-300",
  ].join(" ");

  const labelClasses = "block text-sm font-medium text-purple-200 mb-1";

  if (isTextarea) {
    return (
      <div>
        {label && <label className={labelClasses}>{label}</label>}
        <textarea
          className={`${inputClasses} min-h-[140px]`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          rows={props.minRows || 6}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type="text"
      className={inputClasses}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};

/**
 * Simple Button component replacement. Purplish color scheme.
 */
const CustomButton = ({ children, className, disabled, type = 'button', onPress }: { children: React.ReactNode, className?: string, disabled?: boolean, type?: "button" | "submit" | "reset", onPress?: () => void }) => (
  <button
    type={type}
    onClick={onPress}
    disabled={disabled}
    className={`px-4 py-2 rounded-full font-semibold transition-all duration-200 ${className}`}
  >
    {children}
  </button>
);


/**
 * Success message display component. Purplish color scheme.
 */
const SuccessMessage = ({ onSendAnother }: { onSendAnother: () => void }) => (
  <motion.div
    key="success"
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center gap-5 text-center p-10 rounded-2xl border border-purple-300/30 bg-white/20 shadow-2xl backdrop-blur-md text-white"
    exit={{ opacity: 0 }}
    initial={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.3 }}
  >
    <CheckCircle className="w-12 h-12 text-green-300" />
    <h2 className="text-2xl font-semibold">Thank you for your feedback!</h2>
    <p className="text-purple-100 max-w-md">
      Your message has been sent successfully and is now stored in Firestore.
    </p>
    <CustomButton
      className="mt-3 bg-purple-700 hover:bg-purple-600 text-white rounded-full px-6"
      onPress={onSendAnother}
    >
      Send Another
    </CustomButton>
  </motion.div>
);

// --- Reducer & State Management (No changes needed) ---
const initialState = {
  name: "",
  email: "",
  type: FEEDBACK_TYPES[0],
  message: "",
  loading: false,
  submitted: false,
  isAuthReady: false,
  userId: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formReducer(state: any, action: any) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'SET_LOADING':
      return { ...state, loading: action.value };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        name: "",
        email: "",
        message: "",
        loading: false,
        submitted: true,
      };
    case 'RESET_FORM':
      return { ...initialState, userId: state.userId, isAuthReady: state.isAuthReady };
    case 'SET_AUTH_USER':
      return {
        ...state,
        isAuthReady: true,
        userId: action.userId,
      };
    default:
      return state;
  }
}

// --- Main Component ---
export default function FeedbackPage() {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [errorState, setErrorState] = useState<string | null>(null);
  const { name, email, type, message, loading, submitted, isAuthReady, userId } = state;

  // 1. Authentication Listener (Original logic remains)
  useEffect(() => {
    if (!auth) {
      dispatch({ type: 'SET_AUTH_USER', userId: null });
      return;
    }

    const signInUser = async () => {
      try {
        if (initialAuthToken) {
          await signInWithCustomToken(auth, initialAuthToken);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Firebase Auth Error during sign-in:", error);
      }
    };

    // Check for existing user or sign in
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        dispatch({ type: 'SET_AUTH_USER', userId: user.uid });
      } else {
        // No user, attempt sign in
        signInUser().then(() => {
          // If sign-in still fails, set auth ready with no user ID
          if (!auth.currentUser) {
            dispatch({ type: 'SET_AUTH_USER', userId: 'anonymous-failed' });
          }
        });
      }
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  // 2. Form Submission Handler (Original logic remains)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorState(null);

    if (!isAuthReady || !db || !userId || userId === 'anonymous-failed') {
      const errorMessage = "System is not ready or failed to authenticate. Please wait.";
      console.error(errorMessage);
      setErrorState(errorMessage);
      return;
    }
    if (!message.trim()) {
      const errorMessage = "Please enter a message before submitting.";
      setErrorState(errorMessage);
      return;
    }

    dispatch({ type: 'SET_LOADING', value: true });

    // Define the Firestore path for private user data
    const feedbackCollectionPath = `artifacts/${appId}/users/${userId}/feedback_submissions`;

    try {
      const docRef = await addDoc(collection(db, feedbackCollectionPath), {
        name: name || "Anonymous",
        email: email || "N/A",
        type: type,
        message: message,
        createdAt: new Date().toISOString(),
        submitterId: userId,
      });

      console.log("Feedback submitted successfully with ID: ", docRef.id);
      dispatch({ type: 'SUBMIT_SUCCESS' });

    } catch (error) {
      const errorMessage = "Something went wrong saving the feedback. Check console for details.";
      console.error("Firestore Submission Error:", error);
      setErrorState(errorMessage);
      dispatch({ type: 'SET_LOADING', value: false }); // Stop loading on error
    }
  };

  const handleFieldChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_FIELD', field, value: e.target.value });
  };

  const handleTypeChange = (newType: string) => {
    dispatch({ type: 'SET_FIELD', field: 'type', value: newType });
  }

  const handleSendAnother = () => {
    dispatch({ type: 'RESET_FORM' });
    setErrorState(null);
  }

  // NOTE on Background: I've changed the main div's background to a purple gradient 
  // to allow the 'glassy' (backdrop-blur) elements to have something to blur against.
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center px-6 py-20 font-sans text-white "> {/* PURPLE BACKGROUND */}
      {/* Debug UI for User/Auth status */}
      <div className="absolute top-4 right-4 text-xs text-purple-200 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-lg">
        Auth: {isAuthReady ? `Ready (${userId ? userId.substring(0, 8) + '...' : 'No ID'})` : 'Loading...'}
      </div>

      <motion.div
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-3xl flex flex-col gap-6"
        initial={{ y: -12, opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header - Text color adjusted */}
        <div className="space-y-2">
          <h1 className="text-5xl font-extrabold tracking-tight text-purple-200">
            Feedback & Report 💬
          </h1>
          <p className="text-purple-300 text-lg">
            We value your thoughts! Share feedback, report a bug, or suggest
            improvements.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              animate={{ opacity: 1, y: 0 }}
              // GLASSMORHPISM APPLIED HERE: bg-white/10, border/shadow change, backdrop-blur-lg
              className="p-8 rounded-2xl border border-purple-300/30 flex flex-col gap-6 bg-white/10 shadow-2xl backdrop-blur-lg"
              exit={{ opacity: 0, y: -10 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
            >
              {/* Error Message Display */}
              <AnimatePresence>
                {errorState && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    // Purplish/Red Error box
                    className="p-3 bg-red-800/20 border border-red-500/50 rounded-xl text-sm text-red-300 flex items-center gap-3 backdrop-blur-md"
                  >
                    <XCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
                    <p>{errorState}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Name and Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <StyledInput
                  placeholder="Your name (Optional)"
                  value={name}
                  onChange={handleFieldChange('name')}
                />
                <StyledInput
                  placeholder="your@email.com (Optional)"
                  value={email}
                  onChange={handleFieldChange('email')}
                />
              </div>

              {/* Type Selection - Colors adjusted */}
              <div className="flex flex-wrap gap-3">
                {FEEDBACK_TYPES.map((t) => (
                  <button
                    key={t}
                    className={`px-5 py-2.5 rounded-full border text-sm font-medium transition-all duration-200 ${type === t
                      // Active button: vibrant purple
                      ? "bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-500/50 scale-[1.03]"
                      // Inactive button: glassy/light purple
                      : "border-purple-300/30 text-purple-200 hover:border-purple-400/50 hover:bg-white/5 backdrop-blur-sm"
                      }`}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Message Box */}
              <StyledInput
                label="Message"
                minRows={6}
                placeholder="Write your message here..."
                value={message}
                onChange={handleFieldChange('message')}
                isTextarea
              />

              {/* Submit Button - Colors adjusted */}
              <div className="flex justify-end">
                <CustomButton
                  // Main submit button: vibrant purple
                  className="px-8 py-3 rounded-full font-semibold bg-purple-600 text-white hover:bg-purple-500 hover:scale-[1.03] transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  disabled={loading || !message.trim() || !isAuthReady}
                  type="submit"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </CustomButton>
              </div>
            </motion.form>
          ) : (
            <SuccessMessage onSendAnother={handleSendAnother} />
          )}
        </AnimatePresence>

        {/* Note - Colors adjusted, Glassmorphism applied */}
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          // GLASSMORHPISM APPLIED HERE: bg-white/10, border/shadow change, backdrop-blur-md
          className="mt-10 flex flex-col sm:flex-row items-center gap-3 text-sm text-purple-200 bg-white/10 p-4 rounded-xl border border-purple-300/30 backdrop-blur-md"
          initial={{ opacity: 0, y: 12 }}
          transition={{ delay: 0.3 }}
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-yellow-300" />
          <p>
            Your feedback is secured in our **Firestore** database under your user ID ({userId ? userId.substring(0, 8) + '...' : 'Loading...'}). Do not share sensitive information.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}