# iSITE+ (Next-Gen Student Engagement Platform)

iSITE+ is a modern web application designed for students of the **Polytechnic University of the Philippines (PUP)**. It provides a centralized hub for announcements, community interactions, and administrative tools with a sleek, premium purple-themed glassmorphism design.

---

## 🚀 Key Features

### 🔐 Secure Authentication & Session Management
- **PUP-Exclusive Login**: Only `@iskolarngbayan.pup.edu.ph` email addresses are permitted.
- **Two-Factor Authentication (2FA)**: Every login requires a 6-digit code sent via email (Gmail/Outlook supported).
- **Auto-Logout Security**: 
  - **10-Minute Absolute Timeout**: Forced re-login every 10 minutes for data safety.
  - **5-Minute Inactivity Timeout**: Automatic logout if the user is idle.

### 👥 Community & Social
- **Real-Time Feed**: Share posts, images, and updates with other students.
- **Interactions**: Like and comment on posts.
- **Moderated Space**: Built-in recycle bin and reporting for a safe environment.

### 📋 Information & Tools
- **Announcements**: Interactive modals for official university or organization updates.
- **Profile Management**: View post and comment history (deleted posts/comments are automatically filtered out).
- **iReader & iQr**: Tools for event attendance and identification (restricted to Admin/Moderator).
- **iEvaluation**: Digital feedback system for student events.

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Node.js (Latest LTS version)
- Firebase Project (Firestore, Auth, and Storage enabled)
- A Gmail or Outlook account for the 2FA system.

### 2. Environment Variables
Create a `.env.local` file in the root directory and add:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...

# Firebase Admin (Required for 2FA & Server Actions)
FIREBASE_SERVICE_ACCOUNT_KEY='{...}'

# Session Secret (Random String)
SESSION_SECRET=your_random_secret_here

# Email Configuration (2FA)
EMAIL_SERVICE=gmail # or outlook
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
```

### 3. Install & Run
```bash
npm install
npm run dev
```

---

## 📖 User Tutorial

### Step 1: Logging In
1. Click the **Login** button on the Navbar.
2. Enter your **PUP Webmail** and password.
3. Wait for the **2FA screen**. 
4. Check your email (check **Junk/Spam** folder if not in primary).
5. Enter the **6-digit code** to enter the site.

### Step 2: Community Interaction
- Navigate to the **Community** tab.
- Click **Create Post** to share updates.
- Use the **Like** heart and **Comment** bubble on any post to engage with peers.

### Step 3: Managing Your Profile
- Click **Profile** in the Menu dropdown.
- You can view all your active posts and comments.
- Note: If a post you commented on is deleted, that comment will no longer show in your history.

### Step 4: Admin & Moderator Tools
- Authorized users have access to the **Dashboard**.
- **User Management**: Whitelist users for specific roles.
- **Recycle Bin**: Restore accidentally deleted posts or permanently remove them.
- **Activity Logs**: Monitor all sensitive actions within the platform.

---

## 🌍 Deployment

iSITE+ is pre-configured for **Vercel**. 
- Push your code to GitHub.
- Import the project into Vercel.
- Copy your `.env.local` variables into the **Environment Variables** section of the Vercel dashboard.

---

## ⚖️ Security Notice
- The session duration is hardcoded to **10 minutes** to comply with high security standards for student data.
- Ensure your `FIREBASE_SERVICE_ACCOUNT_KEY` and `SESSION_SECRET` are never shared publicly.

---
© 2026 iSITE+ Team | Developed for PUP Thesis/Capstone Excellence.
