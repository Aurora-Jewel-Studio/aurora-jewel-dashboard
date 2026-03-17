# 💎 Aurora Jewel Studio Platform

A premium, mobile-first management dashboard designed for modern jewellery studios. This platform streamlines design pipelines, lead tracking, and pricing workflows for designers, staff, and studio owners.

## 🚀 Key Features

### 🎨 Design Hub (Pipeline Management)

- **Visual Card Grid**: Optimized for mobile and non-technical designers.
- **Role-Aware Views**: Simple gallery for designers; full stage controls and filtering for admins.
- **Design Lifecycle**: Track progress from Reference Image → CAD Development → Final Design.
- **Collaboration**: Integrated comment threads on every design card for real-time feedback.
- **Search & Filtering**: Effortlessly manage pipelines with 20-30+ designs using powerful search and stage filters.

### 💰 Price Converter

- **Excel Automation**: Batch process jewelry price lists using `exceljs`.
- **Intelligent Mapping**: Converts raw vendor data into studio-standard pricing formats.

### 📈 Instagram Leads

- **Lead Tracking**: Centralized management for social media inquiries.
- **Interest Scoring**: Categorize leads by status and potential interest level.

### 📊 Performance Analytics

- **Live Dashboard**: Real-time overview of active projects, total leads, and pipeline velocity.
- **Conversion Tracking**: Monitor the journey from initial inquiry to completed design.

---

## 🔐 Role-Based Access Control (RBAC)

The platform supports four distinct user roles with varying permission levels:

| Role           | Access Level   | Key Capabilities                                             |
| :------------- | :------------- | :----------------------------------------------------------- |
| **Superadmin** | Full Control   | System management, User creation/deletion, All Hub features. |
| **Owner**      | Administrative | Full Pipeline control, Price conversion, Analytics.          |
| **Staff**      | Management     | Lead management, Pipeline archiving, Analytics access.       |
| **Designer**   | Production     | Access to assigned designs, CAD/Final uploads, Commenting.   |

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router)
- **Frontend**: React 19, Tailwind CSS 4, Framer Motion
- **Icons**: [Lucide React](https://lucide.dev/)
- **Backend / BaaS**: [Supabase](https://supabase.com/) (PostgreSQL, Auth, Storage)
- **Excel Processing**: [ExcelJS](https://github.com/exceljs/exceljs)
- **Deployment**: [Vercel](https://vercel.com/) with integrated Vercel Cron jobs.

---

## 💻 Getting Started

### Prerequisites

- Node.js 20+
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables in `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   CRON_SECRET=your_random_secret
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

### Database Setup

The platform requires specific tables in Supabase:

- `users`: User profiles with roles.
- `pipelines`: Grouping for design cards.
- `design_cards`: Core design data.
- `comments`: Design-specific discussions.
- `leads`: Instagram inquiry data.

---

## ☁️ Deployment

### Vercel Deployment

1. Import the repository into Vercel.
2. Add the environment variables mentioned above.
3. Vercel will automatically detect the `vercel.json` configuration for the Daily Pipeline Archiver cron job.

### Automated Tasks

The platform includes a daily cron job located at `/api/cron/archive-pipelines` which automatically archives pipelines that have been inactive for over 3 months.

---

## 📱 Mobile-First Revamp

Recently updated with a **Bottom Navigation** and **Fullscreen Design Modals** specifically built for studio floors. This allows designers to easily reference images and upload progress photos directly from their mobile devices while working at their benches.

---

Produced by **Aurora Jewel Studio Engineering**.
