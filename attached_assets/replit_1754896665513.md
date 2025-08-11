# Overview

LeaveFlow is a complete web application for annual leave management designed for small teams of 5 employees. The system provides role-based access control with admin and employee dashboards, calendar-based leave request functionality, and Slack integration for notifications. Built as a full-stack application using React frontend with Express backend, the system automatically tracks leave balances and provides an intuitive interface for managing time off requests.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client uses **React with TypeScript** and follows a modern component-based architecture:
- **UI Framework**: Shadcn/ui components built on Radix UI primitives for accessibility and design consistency
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Calendar Integration**: FullCalendar library for interactive date selection and leave visualization
- **Forms**: React Hook Form with Zod validation for type-safe form handling

The frontend is structured with protected routes that redirect based on user roles (admin vs employee) and includes comprehensive error handling and loading states.

## Backend Architecture
The server uses **Express.js with TypeScript** following RESTful API design:
- **Authentication**: Passport.js with Local Strategy for email/password authentication
- **Session Management**: Express-session with PostgreSQL session store for persistent sessions
- **Password Security**: Node.js crypto module with scrypt for secure password hashing
- **API Structure**: Role-based middleware for admin/employee access control
- **Request Validation**: Zod schemas shared between frontend and backend for consistent validation

## Database Design
Uses **PostgreSQL** with **Drizzle ORM** for type-safe database operations:
- **Users Table**: Stores employee information, roles, and leave quotas
- **Leave Requests Table**: Tracks all leave submissions with foreign key relationships
- **Schema Validation**: Drizzle-zod integration for automatic schema validation
- **Migration Support**: Drizzle Kit for database schema migrations

Key design decisions include automatic leave balance calculation, immediate deduction upon request submission (no approval workflow), and full edit/delete functionality for leave requests with automatic balance restoration.

## Calendar System
Integrated **FullCalendar** provides:
- Multi-date selection for leave requests
- Visual representation of approved/pending leaves
- Role-based calendar views (personal vs all-employee for admins)
- Real-time updates via React Query invalidation

## Authentication Flow
Session-based authentication with secure password handling:
- Passwords hashed using scrypt with salt
- Session cookies with security flags for production
- Protected routes with middleware-based authorization
- Automatic session persistence across browser sessions

# External Dependencies

## Database
- **NeonDB**: Serverless PostgreSQL database with connection pooling
- **Environment Variable**: `DATABASE_URL` for database connection

## Slack Integration
- **Slack Web API**: Bot token-based integration for sending leave notifications
- **Required Environment Variables**: 
  - `SLACK_BOT_TOKEN` for API authentication
  - `SLACK_CHANNEL_ID` for notification destination
- **Notification Content**: Employee name, dates, reason, and remaining balance

## Development Tools
- **Vite**: Build tool and development server with HMR
- **Replit Integration**: Custom plugins for development environment
- **TypeScript**: Full-stack type safety with shared schema definitions

## UI Dependencies
- **Radix UI**: Headless component primitives for accessibility
- **Lucide React**: Icon library for consistent iconography
- **Tailwind CSS**: Utility-first CSS framework with custom design system

The application is designed to run in both development and production environments with environment-specific configurations for security and performance optimization.