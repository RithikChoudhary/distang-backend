# Codex Couples - Backend API

Privacy-first couples app backend. Built with Node.js, Express, TypeScript, and MongoDB.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or remote)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Create .env file (copy from example below)
# Edit .env with your settings

# Start development server
npm run dev
```

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/codex_couples

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

## 📚 API Endpoints

### Authentication
- `POST /auth/register` - Register new user (email/phone + password)
- `POST /auth/login` - Login user

### User
- `GET /user/me` - Get current user profile
- `PUT /user/profile` - Update profile
- `POST /user/profile-photo` - Upload profile photo
- `GET /user/search/:uniqueId` - Search user by ID

### Couple
- `POST /couple/request` - Send pair request
- `POST /couple/accept` - Accept pair request
- `POST /couple/reject` - Reject pair request
- `GET /couple/requests` - Get pending requests
- `POST /couple/breakup` - End relationship
- `GET /couple/certificate` - Get certificate (JSON or PDF with ?format=pdf)

### Consent
- `POST /consent/update` - Update consent settings
- `GET /consent/status` - Get consent status

### Memories
- `POST /memory/upload` - Upload memory (requires mutual photoSharing consent)
- `GET /memory/list` - List memories (requires mutual memoryAccess consent)
- `GET /memory/:id` - Get memory (requires mutual memoryAccess consent)
- `DELETE /memory/:id` - Delete memory (requires mutual memoryAccess consent)

### Location
- `POST /location/share` - Share current location (requires mutual locationSharing consent)

## 🔐 Core Principles

1. **Mutual Consent Required** - Features only work when BOTH partners consent
2. **Consent Can Be Revoked** - Any consent can be revoked anytime
3. **No Spying** - No background tracking or surveillance
4. **Privacy First** - Minimal data collection, secure storage

## 📁 Project Structure

```
backend/
├── src/
│   ├── app.ts              # Express app configuration
│   ├── server.ts           # Server entry point
│   ├── config/
│   │   ├── db.ts           # MongoDB connection
│   │   └── env.ts          # Environment configuration
│   ├── models/
│   │   ├── User.model.ts   # User schema
│   │   ├── Couple.model.ts # Couple relationship schema
│   │   ├── Consent.model.ts # Consent tracking schema
│   │   ├── Memory.model.ts # Shared memories schema
│   │   └── Review.model.ts # Anonymous breakup reviews
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── user.routes.ts
│   │   ├── couple.routes.ts
│   │   ├── consent.routes.ts
│   │   ├── memory.routes.ts
│   │   └── location.routes.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── couple.controller.ts
│   │   ├── consent.controller.ts
│   │   ├── memory.controller.ts
│   │   └── location.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT authentication
│   │   └── consent.middleware.ts # Consent verification
│   └── utils/
│       ├── jwt.ts           # JWT utilities
│       └── pdfGenerator.ts  # Certificate PDF generation
├── uploads/                 # Uploaded files (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT-based authentication
- Consent enforcement at middleware level
- Input validation and sanitization
- Soft delete for memories (archived, not permanently deleted)

## 📝 License

MIT

