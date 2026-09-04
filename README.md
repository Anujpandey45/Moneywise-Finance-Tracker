# 💰 MoneyWise — Personal Finance Tracker

> A modern, secure, and fully responsive personal finance tracker built to help users manage their income, expenses, savings, and financial insights — with an intelligent AI financial assistant.

## ✨ Overview

**MoneyWise** is a full-stack personal finance management application designed to make tracking everyday finances simple and insightful.

Users can securely manage their transactions, monitor their financial performance through an interactive dashboard, and get personalized insights from an integrated AI financial assistant.

The application combines a **cyberpunk/neon aesthetic**, responsive design, secure authentication, and real-time financial data into one modern experience.

---

## 🚀 Features

### 🔐 Secure Authentication

* User signup and login
* Secure authentication powered by **Clerk**
* Private user-specific financial data
* Secure session management and logout

### 📊 Financial Dashboard

Track your financial health at a glance with:

* 💵 Total Earnings
* 💸 Total Expenses
* 📈 Net Profit / Loss
* 💰 Savings Percentage
* Real-time financial metrics

### 💳 Transaction Management

* Add income and expense transactions
* Edit existing transactions
* Delete transactions
* Search transactions
* Categorize transactions

**Example categories:**

* 🏠 Housing
* 🍔 Food
* 🚗 Transport
* 💼 Freelance
* And more

### 🤖 AI Financial Assistant

MoneyWise includes an intelligent AI-powered assistant that can:

* Generate monthly financial summaries
* Analyze spending patterns
* Provide spending insights
* Suggest budgeting strategies
* Answer questions using the user's financial data

### 🎨 Cyberpunk UI

* Modern dark-mode interface
* Glassmorphism cards
* Neon-inspired visual elements
* Crimson and electric-blue accents
* Fully responsive design

### ⚙️ Settings & Personalization

* Profile management
* Theme controls
* Account settings
* Secure logout

---

## 🛠️ Tech Stack

### Frontend

* **React**
* **TypeScript**
* **Tailwind CSS**
* **Lucide Icons**
* **Wouter**

### Backend

* **Node.js**
* **Express.js**
* **TypeScript**

### Database

* **PostgreSQL**
* **Drizzle ORM**

### Authentication

* **Clerk**

---

## 🏗️ Architecture

```text
MoneyWise
│
├── Frontend
│   ├── React
│   ├── TypeScript
│   ├── Tailwind CSS
│   └── Wouter
│
├── Backend
│   ├── Node.js
│   ├── Express
│   └── TypeScript
│
├── Database
│   ├── PostgreSQL
│   └── Drizzle ORM
│
└── Authentication
    └── Clerk
```

---

## ⚡ Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Anujpandey45/Moneywise-Finance-Tracker.git
cd Moneywise-Finance-Tracker
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add the required environment variables.

Example:

```env
DATABASE_URL=your_database_url

CLERK_SECRET_KEY=your_clerk_secret_key
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

# Add other required API keys here
```

> ⚠️ Never commit your `.env` file or expose secret API keys publicly.

### 4. Start the Development Server

```bash
npm run dev
```

The application should now be available on your local development server.

---

## 📱 Responsive Design

MoneyWise is designed to work across different screen sizes:

* 💻 Desktop
* 📱 Mobile
* 📟 Tablet

The UI adapts to different viewport sizes while maintaining a consistent user experience.

---

## 🔒 Security

MoneyWise uses Clerk authentication and user-specific data handling to help keep financial information private.

For local development, make sure sensitive credentials such as database URLs, secret keys, and API keys are stored in environment variables and **never committed to GitHub**.

---

## 🎯 Future Improvements

Potential future enhancements include:

* 📅 Advanced financial reports
* 📊 More detailed spending analytics
* 📈 Interactive financial charts
* 🎯 Budget and savings goals
* 🔔 Financial reminders
* 📤 Export transactions to CSV/PDF
* 📱 Progressive Web App support
* 🤖 More advanced AI-powered financial recommendations

---

## 👨‍💻 Author

**Anuj Pandey**

Computer Science & Engineering Student

GitHub:
https://github.com/Anujpandey45

---

## ⭐ Support

If you find **MoneyWise** useful or interesting, consider giving the repository a ⭐ on GitHub.

---

### 📄 License

This project is intended for educational and portfolio purposes.
