# BuddyBill 🤝💰

**Bills between buddies, simplified.**

A modern, full-featured expense splitting application built with Next.js 16, PostgreSQL, and Drizzle ORM. Track shared expenses, split bills fairly, and settle up with friends — all in one place.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue?style=flat-square&logo=postgresql)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38B2AC?style=flat-square&logo=tailwind-css)

---

## ✨ Features

### 💰 Core Expense Management
- **Equal & Unequal Splits** — Split by percentage, exact amounts, or shares
- **Multiple Categories** — 11 preset categories with emoji icons (🍔 Food, 🚗 Transport, 🛒 Groceries, etc.)
- **Expense Templates** — Save and reuse common expense patterns
- **Edit & Delete** — Full CRUD operations with audit trail
- **Duplicate Detection** — Warns when a similar expense was recently added

### 📊 Analytics & Insights
- **Spending Dashboard** — Visual charts for category breakdown and monthly trends
- **Monthly Trends** — Track spending over time with bar charts
- **Export to CSV** — Download all expense data for accounting
- **Real-time Balances** — Always know who owes what

### 👥 Group Management
- **Invite Links** — Share invite codes to let friends join groups
- **Role System** — Admin and member roles with permissions
- **Archive Groups** — Hide old groups without deleting data
- **Leave Group** — Leave with balance warnings to prevent orphaned debts

### 🔔 Notifications & Social
- **Activity Feed** — Timeline of all actions across your groups
- **Comments** — Discuss and question specific expenses
- **Nudge/Remind** — Send friendly payment reminders to forgetful buddies

### 💳 Settlements
- **Smart Simplification** — Algorithm minimizes the number of payments needed
- **Partial Payments** — Record partial settlements with notes
- **Payment Notes** — Add context like "Venmo" or "Cash" to settlements

### 🎮 Gamification
- **Achievements** — 6 badges to unlock:

| Badge | Name | How to Unlock |
|-------|------|---------------|
| 🎯 | First Step | Add your first expense |
| 💰 | Expense Master | Add 50 expenses |
| 💸 | Debt Free | Make your first settlement |
| ⚡ | Debt Crusher | Settle 10 debts |
| 👑 | Group Founder | Create your first group |
| 🦋 | Social Butterfly | Join 5 groups |

### 🔐 Security
- **Password Authentication** — Secure bcrypt hashing (10 salt rounds)
- **Password Reset** — Token-based reset flow with expiry
- **Session Management** — View and revoke active sessions across devices
- **Admin Dashboard** — Full administrative control panel

### 📱 User Experience
- **Dark Mode** — System-wide dark theme toggle with persistence
- **PWA Ready** — Installable on mobile devices via manifest.json
- **Responsive Design** — Optimized for mobile, tablet, and desktop
- **Search & Filters** — Search groups, filter archived, find anything fast

### 🛠️ Admin Dashboard
- **Feature Flags** — Enable/disable any feature dynamically
- **Integrations** — Configure third-party services (Stripe, PayPal, Slack, etc.)
- **System Settings** — Manage app-wide configuration
- **User Management** — View and manage all registered users
- **Audit Logs** — Track every administrative action with timestamps

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ (recommended: 20+)
- **PostgreSQL** 14+
- **npm** (comes with Node.js)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/buddybill.git
   cd buddybill
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the project root:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/buddybill
   ```

4. **Create the database**
   ```bash
   createdb buddybill
   ```

5. **Push database schema**
   ```bash
   npx drizzle-kit push
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### First-Time Setup

1. Register a new account on the login screen
2. Once logged in, go to **Admin Dashboard** (shield icon in the header)
3. Click **"Seed Data"** to populate default feature flags, integrations, and system settings
4. The first user to seed admin data automatically becomes a `super_admin`

---

## 📁 Project Structure

```
buddybill/
├── public/
│   └── manifest.json          # PWA manifest
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/         # Admin dashboard APIs
│   │   │   │   ├── audit/     # Audit log endpoint
│   │   │   │   ├── check/     # Admin status check
│   │   │   │   ├── features/  # Feature flag CRUD
│   │   │   │   ├── integrations/ # Integration config
│   │   │   │   ├── seed/      # Seed default data
│   │   │   │   ├── settings/  # System settings
│   │   │   │   └── users/     # User management
│   │   │   ├── auth/          # Authentication
│   │   │   │   ├── login/
│   │   │   │   ├── logout/
│   │   │   │   ├── register/
│   │   │   │   └── reset-password/
│   │   │   ├── activities/    # Activity feed
│   │   │   ├── expenses/      # Expense CRUD + comments
│   │   │   ├── export/        # CSV export
│   │   │   ├── friends/       # Friends list
│   │   │   ├── groups/        # Groups + members + templates
│   │   │   ├── health/        # Health check
│   │   │   ├── nudges/        # Payment reminders
│   │   │   ├── seed/          # Achievement seeding
│   │   │   ├── settlements/   # Payment settlements
│   │   │   ├── stats/         # User analytics
│   │   │   └── users/         # User profiles + sessions
│   │   ├── globals.css        # Global styles + dark mode
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Entry point
│   ├── components/
│   │   ├── AdminDashboard.tsx # Admin control panel (6 tabs)
│   │   ├── Avatar.tsx         # User avatar with initials
│   │   ├── Dashboard.tsx      # Main user dashboard
│   │   ├── GroupView.tsx      # Group detail view
│   │   ├── LoginScreen.tsx    # Login / Register / Reset
│   │   ├── Modal.tsx          # Reusable modal
│   │   ├── SettingsPanel.tsx  # User settings
│   │   ├── StatsPanel.tsx     # Analytics panel
│   │   └── Toast.tsx          # Toast notifications
│   ├── db/
│   │   ├── index.ts           # Database connection pool
│   │   └── schema.ts          # Drizzle ORM schema (20 tables)
│   └── lib/
│       ├── types.ts           # TypeScript interfaces
│       └── utils.ts           # Utility functions
├── drizzle.config.json        # Drizzle Kit config
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Database Schema

### Core Tables
| Table | Purpose |
|-------|---------|
| `users` | User accounts with password hash and preferences |
| `groups` | Expense groups with invite codes |
| `group_members` | Group membership with roles (admin/member/viewer) |
| `expenses` | Expense records with split type |
| `expense_splits` | How each expense is divided |
| `settlements` | Payment records between users |

### Feature Tables
| Table | Purpose |
|-------|---------|
| `expense_comments` | Threaded comments on expenses |
| `expense_templates` | Saved expense patterns for quick reuse |
| `nudges` | Payment reminder notifications |
| `achievements` | Badge definitions |
| `user_achievements` | Unlocked badges per user |
| `activity_log` | Feed of all group activity |

### Admin Tables
| Table | Purpose |
|-------|---------|
| `admin_users` | Admin role assignments |
| `feature_flags` | Toggleable feature switches |
| `integrations` | Third-party service configurations |
| `system_settings` | App-wide key/value settings |
| `admin_audit_log` | Audit trail for admin actions |

### Auth Tables
| Table | Purpose |
|-------|---------|
| `user_sessions` | Active login sessions |
| `password_reset_tokens` | Time-limited reset tokens |
| `friends` | Bidirectional friend relationships |

---

## 🔧 Configuration

### Feature Flags

Managed via Admin Dashboard → **Features** tab:

| Flag | Description | Default |
|------|-------------|---------|
| `dark_mode` | Dark theme support | ✅ Enabled |
| `achievements` | Gamification badges | ✅ Enabled |
| `expense_comments` | Comments on expenses | ✅ Enabled |
| `expense_templates` | Save expense templates | ✅ Enabled |
| `unequal_splits` | Percentage/exact/shares splits | ✅ Enabled |
| `recurring_expenses` | Auto-create expenses | ❌ Disabled |
| `receipt_upload` | Attach receipt photos | ❌ Disabled |
| `export_csv` | Export to CSV | ✅ Enabled |
| `nudge_reminders` | Payment reminders | ✅ Enabled |
| `email_notifications` | Email alerts | ❌ Disabled |
| `group_invite_links` | Invite codes | ✅ Enabled |
| `group_roles` | Admin/member roles | ✅ Enabled |
| `activity_feed` | Activity timeline | ✅ Enabled |
| `analytics_dashboard` | Spending analytics | ✅ Enabled |

### Available Integrations

Configured via Admin Dashboard → **Integrations** tab:

| Integration | Category | Description |
|-------------|----------|-------------|
| Stripe | Payment | Accept card payments |
| PayPal | Payment | PayPal payment integration |
| Venmo | Payment | Venmo payment links |
| Slack | Communication | Slack bot notifications |
| Discord | Communication | Discord bot integration |
| Google Auth | Authentication | Google Sign-In |
| Apple Auth | Authentication | Apple Sign-In |
| SendGrid | Email | Email delivery |
| Twilio | SMS | SMS notifications |
| Plaid | Banking | Bank account linking |

### System Settings

Managed via Admin Dashboard → **Settings** tab:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `app_name` | string | BuddyBill | Application name |
| `max_group_members` | number | 50 | Max members per group |
| `max_expense_amount` | number | 100000 | Max expense value |
| `default_currency` | string | USD | Default currency |
| `session_timeout_hours` | number | 168 | Session timeout (7 days) |
| `enable_registration` | boolean | true | Allow new signups |
| `maintenance_mode` | boolean | false | Maintenance mode |
| `support_email` | string | support@buddybill.app | Support contact |

---

## 📝 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create a new account |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Sign out (invalidate session) |
| `POST` | `/api/auth/reset-password` | Request or complete password reset |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create a user (add friend) |
| `GET` | `/api/users/:id` | Get user profile |
| `PATCH` | `/api/users/:id` | Update user settings |
| `GET` | `/api/users/:id/sessions` | List active sessions |
| `DELETE` | `/api/users/:id/sessions` | Revoke sessions |
| `GET` | `/api/users/:id/achievements` | List achievements |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/groups` | List user's groups |
| `POST` | `/api/groups` | Create a group |
| `POST` | `/api/groups/join` | Join via invite code |
| `GET` | `/api/groups/:id` | Full group details |
| `PATCH` | `/api/groups/:id` | Update/archive group |
| `DELETE` | `/api/groups/:id` | Delete group |
| `POST` | `/api/groups/:id/members` | Add member |
| `PATCH` | `/api/groups/:id/members` | Update member role |
| `DELETE` | `/api/groups/:id/members` | Remove/leave member |
| `GET` | `/api/groups/:id/templates` | List expense templates |
| `POST` | `/api/groups/:id/templates` | Save a template |
| `DELETE` | `/api/groups/:id/templates` | Delete a template |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/expenses` | Search/filter expenses |
| `POST` | `/api/expenses` | Create an expense |
| `GET` | `/api/expenses/:id` | Get expense details |
| `PATCH` | `/api/expenses/:id` | Edit an expense |
| `DELETE` | `/api/expenses/:id` | Delete an expense |
| `GET` | `/api/expenses/:id/comments` | List comments |
| `POST` | `/api/expenses/:id/comments` | Add a comment |
| `DELETE` | `/api/expenses/:id/comments` | Delete a comment |

### Settlements & Social
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/settlements` | Record a payment |
| `GET` | `/api/stats` | User spending analytics |
| `GET` | `/api/activities` | Activity feed |
| `GET` | `/api/export` | Export expenses as CSV |
| `GET/POST/DELETE` | `/api/friends` | Manage friend list |
| `GET/POST/PATCH` | `/api/nudges` | Payment reminders |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin` | Dashboard stats |
| `POST` | `/api/admin` | Create an admin user |
| `GET` | `/api/admin/check` | Check if user is admin |
| `POST` | `/api/admin/seed` | Seed default admin data |
| `GET/POST/PATCH/DELETE` | `/api/admin/features` | Feature flag management |
| `GET/POST/PATCH/DELETE` | `/api/admin/integrations` | Integration management |
| `GET/POST/DELETE` | `/api/admin/settings` | System settings |
| `GET` | `/api/admin/users` | Paginated user list |
| `GET` | `/api/admin/audit` | Admin audit log |

---

## 🧪 Development

### Scripts

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run typecheck

# Lint
npm run lint
```

### Database Commands

```bash
# Push schema changes directly (no migration files)
npx drizzle-kit push

# Generate migration SQL files
npx drizzle-kit generate

# Open Drizzle Studio (database GUI)
npx drizzle-kit studio
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5.9 |
| **Database** | PostgreSQL via Drizzle ORM |
| **Styling** | Tailwind CSS 4.1 |
| **Icons** | Lucide React |
| **Auth** | bcryptjs (password hashing) |
| **Runtime** | Node.js 18+ |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — React framework
- [Drizzle ORM](https://orm.drizzle.team/) — TypeScript ORM
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Lucide Icons](https://lucide.dev/) — Beautiful icon library
- [Splitwise](https://splitwise.com/) — Original inspiration

---

<div align="center">

Built with ❤️ by the **BuddyBill** team

*Bills between buddies, simplified.*

</div>
