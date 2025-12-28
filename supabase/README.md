# Database Setup Guide

This guide will help you set up the Supabase database for the GoalStakes app.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. A new Supabase project created

## Setup Steps

### 1. Create Your Supabase Project

1. Go to https://supabase.com and create a new project
2. Wait for the project to be fully provisioned
3. Note down your project URL and anon key from Settings > API

### 2. Run the Database Schema

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the entire contents of `schema.sql` from this directory
4. Paste it into the SQL Editor
5. Click "Run" to execute the schema

This will create:
- All necessary tables (profiles, goals, alarms, tasks, etc.)
- Row Level Security (RLS) policies
- Database triggers and functions
- Indexes for performance

### 3. Configure Environment Variables

Add these to your `.env` file or Expo config:

```
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Or add to `app.json` under `expo.extra`:

```json
{
  "expo": {
    "extra": {
      "supabaseUrl": "your-project-url",
      "supabaseAnonKey": "your-anon-key"
    }
  }
}
```

### 4. Verify Setup

After running the schema, verify the tables were created:

1. Go to Table Editor in Supabase dashboard
2. You should see these tables:
   - `profiles`
   - `goals`
   - `friendships`
   - `goal_collaborations`
   - `alarm_clocks`
   - `alarm_logs`
   - `verifications`
   - `tasks`
   - `transactions`

## Database Schema Overview

### Core Tables

- **profiles**: User profiles with wallet balance
- **goals**: User goals with stakes and deadlines
- **alarm_clocks**: Alarm clocks with penalty codes
- **tasks**: Tasks users can complete to earn money back
- **transactions**: All money movements

### Collaboration Tables

- **friendships**: Friend relationships
- **goal_collaborations**: Friends betting on each other's goals

### Verification Tables

- **verifications**: Proof submissions for goal completion
- **alarm_logs**: Records of alarm code entries

## Security

All tables have Row Level Security (RLS) enabled. Users can only:
- View and edit their own data
- View goals they collaborate on
- View friendships they're part of

## Next Steps

1. Test authentication by signing up a user
2. Create a test goal
3. Set up an alarm clock
4. Test the transaction system

## Troubleshooting

If you encounter errors:

1. **RLS Policy Errors**: Make sure you're authenticated when testing
2. **Foreign Key Errors**: Ensure related records exist
3. **Permission Errors**: Check that RLS policies are correctly set up

For more help, check the Supabase documentation: https://supabase.com/docs

