# Product Requirement Document (PRD) - GymTracker

## 1. Introduction
GymTracker is a comprehensive fitness tracking application designed to help users log their workouts, track progress, and receive AI-powered coaching. It features a modern, mobile-first interface built with Next.js and React.

## 2. User Flow
- **Dashboard:** Users start at the dashboard where they see their daily routine suggestion (AI-powered) or their scheduled workout.
- **Workout Selection:** Users select a routine (e.g., "Pecho / Espalda", "Pierna").
- **Workout Execution:**
  - **Standard Mode:** Users log sets, reps, and weight for each exercise.
  - **AI Mode:** Users can opt for an AI-assisted logging flow where they select exercises and provide feedback.
- **Completion:** After finishing, users receive a summary of their workout, including duration and estimated calories burned. AI provides feedback on intensity.
- **History:** Users can view past workouts and track their weight progress.

## 3. Key Features
- **Routine Management:** Pre-defined routines with categorized exercises (Chest, Back, Legs, Arms).
- **Workout Logging:** Detailed logging of exercises, including supersets (biseries).
- **AI Coaching:**
  - Daily tips based on workout history.
  - Post-workout analysis and feedback.
  - Interactive chat for fitness advice.
- **Timer:** Integrated rest timer.
- **Progress Tracking:** Visualization of muscle groups worked and weight history.

## 4. Tech Stack
- **Frontend:** Next.js (App Router), React, Tailwind CSS.
- **Backend:** Next.js API Routes, Prisma ORM.
- **Database:** PostgreSQL.
- **AI:** Groq API integration.

## 5. System Requirements
- The system must accurately store and retrieve workout data.
- The AI components must respond within reasonable timeframes (streaming supported).
- The UI must be responsive and functional on mobile devices.
