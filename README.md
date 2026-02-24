# Habit Tracker - Series-Based Streak System

A modern habit tracking web application built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. Features a unique "series-based" streak system for tracking habits and daily activities.

## Features

- **Series-Based Streak System**: Track habits with automatic streak calculation
- **Visual Progress Tracking**: See your last 7 days at a glance
- **Milestone Celebrations**: Animated celebrations for streak milestones (5, 10, 25, 50, 100)
- **Health Tracking**: Log fitness, meals, sunlight, and screen time
- **Quick Notes**: Capture thoughts with tags and pinning
- **Clean UI**: Minimal design with smooth animations

## Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (Database & Authentication)
- **Shadcn/ui** components

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Setup Instructions

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Create a new Supabase project at [supabase.com](https://supabase.com)
   - Go to SQL Editor and run the schema from `supabase/schema.sql`
   - Copy your project URL and anon key from Settings > API

3. **Configure environment variables:**
   - Copy `.env.local.example` to `.env.local`
   - Fill in your Supabase credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Database Schema

The application uses 4 main tables:

1. **habits_series**: Stores habit information with streak tracking
2. **daily_logs**: Tracks daily completions with sequence numbers
3. **health_tracking**: Flexible storage for health metrics
4. **quick_notes**: Simple note-taking with tags

See `supabase/schema.sql` for the complete schema with RLS policies.

## Streak Logic

The series-based streak system works as follows:

- If you tick a habit today and the last tick was **yesterday or today**: increment the streak
- If the last tick was **more than 1 day ago**: reset the streak to 1
- The `best_sequence` always tracks your highest streak achieved
- Milestones trigger celebration animations at 5, 10, 25, 50, and 100 days

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home/Dashboard page
│   ├── auth/              # Authentication page
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── SeriesTicker.tsx   # Main habit tracking component
│   ├── AddHabitModal.tsx  # Create habit modal
│   ├── Dashboard.tsx      # Dashboard layout
│   ├── HealthTrackingSection.tsx  # Health tracking container
│   ├── health/            # Health tracking components
│   │   ├── FitnessLogger.tsx
│   │   ├── MealLogger.tsx
│   │   ├── SunlightTracker.tsx
│   │   ├── ScreenTimeTracker.tsx
│   │   └── QuickNotes.tsx
│   └── ui/                # Shadcn/ui components
├── lib/                   # Utilities and config
│   ├── supabase/         # Supabase client and types
│   └── utils.ts          # Helper functions
└── supabase/             # Database schema
    └── schema.sql        # Complete database schema
```

## Next Steps

This is an MVP focusing on core functionality. Future enhancements could include:

- Calendar view for events
- Advanced health tracking visualizations
- Habit analytics and insights
- Mobile app version
- Social features and sharing

## License

MIT
