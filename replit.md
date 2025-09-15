# Overview

SecureExam is a comprehensive online examination platform designed to provide secure, proctored testing capabilities with advanced monitoring features. The application combines QR code-based hall ticket authentication, AI-powered face detection, real-time monitoring dashboards, and a secure kiosk exam mode to ensure academic integrity during online examinations.

The platform serves two primary user types: administrators who create and monitor exams, and students who take authenticated examinations under controlled conditions.

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
- OAuth-based authentication through Replit's identity provider
- Role-based access control (admin/student roles)
- Session management with PostgreSQL storage
- Middleware-based route protection

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

- **Database**: Neon PostgreSQL serverless database
- **Authentication**: Replit OAuth service for user authentication
- **UI Components**: Radix UI primitives for accessible component foundation
- **Styling**: Tailwind CSS for utility-first styling approach
- **QR Code Generation**: qrcode library for hall ticket QR generation
- **Face Detection**: Browser native APIs for real-time face recognition
- **WebSocket**: Native WebSocket API for real-time communication
- **File Upload**: Browser File API for identity verification
- **Session Management**: PostgreSQL-backed sessions via connect-pg-simple