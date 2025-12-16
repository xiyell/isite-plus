export interface SystemAction {
  id: string;              // Firestore document ID
  action: string;          // e.g. "USER_LOGIN", "DELETE_POST"
  actorId: string;         // User/System ID
  actorName: string;       // Display name
  actorRole: 'admin' | 'moderator' | 'user' | 'system';
  category: 'auth' | 'content' | 'system' | 'security';
  message: string;         // Human-readable message
  severity: 'error' | 'warning' | 'info' | 'success';
  createdAt: string;       // ISO string or Firestore timestamp
}
