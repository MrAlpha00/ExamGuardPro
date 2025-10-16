# Overview

SecureExam is a comprehensive online examination platform designed to provide secure, proctored testing capabilities with advanced monitoring features. The application combines QR code-based hall ticket authentication, AI-powered face detection, real-time monitoring dashboards, and a secure kiosk exam mode to ensure academic integrity during online examinations.

The platform serves two primary user types: administrators who create and monitor exams, and students who take authenticated examinations under controlled conditions.

# Recent Changes

## October 16, 2025 - ID Card Upload & Results Enhancement
- **ID Card Image Upload System**: Added `idCardImageUrl` field to hall_tickets schema for storing student ID card images
  - Admin can now upload student ID card images (with barcode) during hall ticket generation
  - Client-side validation: file type checking and 5MB size limit
  - Base64 encoding for image storage
  - Real-time image preview in admin form
- **Enhanced Results Page**: Updated backend to join exam sessions with hall tickets and user data
  - Results now display: student name, hall ticket number, exam name, score, completion date
  - Improved CSV export with exam names from hall ticket data
  - Fixed TypeScript type issues for production stability
- **Barcode Verification Flow**: Verified and tested end-to-end barcode scanning
  - Camera-based barcode scanning with html5-qrcode
  - Manual entry fallback option
  - Proper scanner cleanup to prevent camera lock issues
- **Timer Functionality**: Confirmed exam timer working correctly
  - Displays countdown in HH:MM:SS format
  - Auto-submits exam when time expires
  - Safety checks prevent premature submission

## October 3, 2025 - Initial Replit Setup
- Successfully imported from GitHub
- Created PostgreSQL database using Replit's built-in database service
- Pushed database schema using `npm run db:push`
- Configured workflow to run on port 5000 with webview output
- Server configured to bind to 0.0.0.0:5000 for Replit proxy compatibility
- Vite configured with `allowedHosts: true` for Replit iframe preview
- Added `server/admin-credentials.json` to .gitignore for security
- Deployment configuration set to "autoscale" deployment target

## Development Setup
For local development, the application uses file-based admin credentials from `server/admin-credentials.json`. The demo credentials are:
- Email: `admin@secureexam.com`
- Password: `Admin1230`

## Production Deployment
For production deployments, set these environment variables:
- `JWT_SECRET`: A strong random secret (min 32 characters)
- `ADMIN_EMAIL`: Admin email address
- `ADMIN_PASSWORD_HASH`: Bcrypt hash of admin password
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Set to "production"
- `OPENAI_API_KEY`: (Optional, for AI verification features)

The application enforces environment-based credentials in production and will refuse to start without them.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on top of Radix UI primitives
- **Styling**: Tailwind CSS with a custom design system featuring gradient themes and glassmorphism effects
- **Routing**: Wouter for client-side routing with role-based route protection
- **State Management**: TanStack Query for server state management and caching

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API with WebSocket support for real-time features
- **Authentication**: Replit OAuth integration with session-based authentication
- **Real-time Communication**: WebSocket server for live monitoring and incident reporting

## Data Storage
- **Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Session Storage**: PostgreSQL-backed session store using connect-pg-simple
- **Migrations**: Drizzle Kit for schema migrations

## Key Features Architecture

### Authentication & Authorization
- JWT-based authentication for admin users (portable, works on any platform)
- Role-based access control (admin/student roles)
- Session management with PostgreSQL storage
- Middleware-based route protection
- Students authenticate using QR code-based hall tickets

### QR Code System
- Hall ticket generation with embedded metadata (student info, exam details, timestamps)
- QR code validation with expiration checks
- Secure authentication flow using QR scanning

### AI-Powered Monitoring
- Browser-based face detection using web APIs
- Real-time webcam monitoring with violation detection
- Multiple face detection and attention tracking
- Configurable sensitivity thresholds

### Real-time Monitoring
- WebSocket-based live communication between admin dashboard and student clients
- Real-time incident logging and alerting
- Live exam session monitoring with status updates
- Admin dashboard with live statistics and controls

### Exam Security
- Fullscreen exam mode with exit prevention
- Tab switching detection and logging
- Camera monitoring throughout exam duration
- Automatic security incident creation and escalation

## External Dependencies

- **Database**: PostgreSQL (Replit's built-in database service in development, Neon or other providers for production)
- **Authentication**: JWT-based authentication (portable across platforms)
- **UI Components**: Radix UI primitives for accessible component foundation
- **Styling**: Tailwind CSS with custom design system
- **QR Code Generation**: qrcode library for hall ticket QR generation
- **Face Detection**: Browser native APIs for real-time face recognition
- **WebSocket**: Native WebSocket API for real-time communication
- **File Upload**: Browser File API for identity verification
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple
- **Password Hashing**: bcrypt for secure password storage