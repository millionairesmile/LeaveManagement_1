# Overview

LeaveFlow is a complete web application for annual leave management designed for small teams of 5 employees. The system provides role-based access control with admin and employee dashboards, calendar integration for leave visualization, and optional Slack notifications for team communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses **React with TypeScript** and follows a modern component-based architecture:
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessibility and design consistency
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Calendar Integration**: React Day Picker for date selection and leave visualization
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **Build Tool**: Vite for fast development and optimized production builds

The frontend is structured with protected routes that redirect based on user roles (admin vs employee) and includes comprehensive error handling and loading states.

## Backend Architecture
The server uses **Express.js with TypeScript** following RESTful API design:
- **Authentication**: Passport.js with Local Strategy for email/password authentication
- **Session Management**: Express-session for persistent sessions across requests
- **Password Security**: BCrypt for secure password hashing and verification
- **API Structure**: Role-based middleware for admin/employee access control with separate route handlers
- **Request Validation**: Zod schemas shared between frontend and backend for consistent validation

## Database Design
Uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations:
- **Users Table**: Stores employee information, roles, and leave quotas with proper constraints
- **Leave Requests Table**: Tracks all leave submissions with foreign key relationships to users
- **Schema Validation**: Drizzle-zod integration for automatic schema validation and type safety
- **Migration Support**: Drizzle Kit for database schema migrations and version control
- **Connection**: Neon Database for serverless PostgreSQL hosting

Key design decisions include automatic leave balance calculation, immediate deduction upon request submission (no approval workflow), and full edit/delete functionality for leave requests with automatic balance restoration.

## Deployment Strategy
The application supports multiple deployment patterns:
- **Monolithic Development**: Single Express server serving both API and static files via Vite
- **Microservice Production**: Separate frontend (Vercel static) and backend (Vercel serverless functions)
- **Session Storage**: In-memory for development, PostgreSQL-based for production scaling

## Authentication Flow
Session-based authentication with secure password handling:
- Passwords hashed using BCrypt with automatic salt generation
- Session cookies with security flags appropriate for environment
- Protected routes with middleware-based authorization
- Role-based access control for admin vs employee features

## Calendar System
Integrated calendar functionality provides:
- Multi-date selection for leave requests using React Day Picker
- Visual representation of approved/pending leaves with color coding
- Role-based calendar views (personal vs all-employee for admins)
- Real-time updates via React Query cache invalidation

# External Dependencies

## Core Technologies
- **Database**: PostgreSQL via Neon Database for serverless hosting
- **UI Components**: Radix UI primitives for accessible component foundation
- **Styling**: Tailwind CSS for utility-first styling approach
- **Authentication**: Passport.js ecosystem for standardized auth patterns

## Optional Integrations
- **Slack Integration**: Webhook-based notifications for team communication (optional configuration)
- **Development Tools**: Replit integration for cloud-based development environment

## Build and Deployment
- **Frontend Build**: Vite for modern JavaScript bundling and optimization
- **Backend Runtime**: Node.js with TypeScript compilation via TSX
- **Database Management**: Drizzle Kit for schema migrations and database operations
- **Hosting**: Vercel for both static frontend and serverless function deployment