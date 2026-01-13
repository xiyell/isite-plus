# iSite+ Platform Walkthrough

## 1. Introduction
**iSite+** is a comprehensive campus management and community platform designed to streamline student activities, specific course requirements, and campus communication. It integrates social connection, event management, attendance tracking, and AI assistance into a single, cohesive interface.

---

## 2. Getting Started

### Registration & Login
- **Sign Up**: New users must register using their **Student ID** and valid credentials.
- **Verification**: The system verifies Student IDs against a whitelist to ensure only authorized students (e.g., specific years/sections) can join.
- **Authentication**: Secure login is handled via email/password or Google authentication.

---

## 3. Core Features & Navigation

### 🏠 Dashboard
The central hub of the application.
- **Overview**: View your attendance stats, upcoming events, and quick actions.
- **Activity Logs**: Track recent actions (e.g., profile updates, posts). New: Tracks who changed a user's name.
- **iBot Assistant**: A smart AI chat bot found in the dashboard.
  - *Tip*: Ask "What are the latest announcements?" or type "events" to get real-time updates from the system.

### 👥 Community
The social heart of iSite+.
- **Feed**: View posts from other students.
- **Create Posts**: Share thoughts, questions, or updates.
- **Interact**: 
  - **Comments**: Discuss posts. You can now **delete your own comments** if you make a mistake.
  - **Likes**: Show appreciation for content.
- **Profiles**: Click on any user's name or avatar to view their detailed profile.

### 📝 Evaluations (iEvaluation)
Feedback system for campus events.
- **Take Evaluations**: When an event is active, you can submit structured feedback.
- **Safety**: The system now asks for **confirmation** before submitting to prevent accidental partial responses.

### 📢 Announcements
Stay updated with official campus news.
- **Feed**: Read the latest news cards.
- **Integration**: Works directly with iBot for quick retrieval.

### 👤 User Profile
Your personal identity on iSite+.
- **Customization**:
  - **Themes**: Choose from Cyan, Purple, Green, Orange, or Pink accents.
  - **Bio**: Tell others about yourself.
  - **Photo**: Update your avatar via URL.
- **Stats**: View your Karma points, total posts, and comments.
- **Edit Modal**: Update your display name, year level, and section. (Admins/Mods can see logs of name changes).

---

## 4. Admin & Moderator Tools
*(Visible to authorized roles only)*

### User Management
- **Modify Users**: Admins can update passwords or user details.
- **Recycle Bin**: Soft-delete users or posts and restore them later if needed.
- **Whitelisting**: Manage the list of allowed Student IDs.

### Content Moderation
- **Reject/Approve**: Moderators can review community posts before they go public (if enabled) or remove inappropriate content.
- **Trash Bin**: Deleted items go here first before permanent removal.

---

## 5. Technical Highlights
- **Real-time**: Posts and chats update instantly.
- **Secure**: All data is stored in Firestore with robust security rules.
- **Responsive**: Works on desktop and mobile devices.
