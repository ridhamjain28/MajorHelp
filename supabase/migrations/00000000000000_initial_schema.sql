-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Members Table
CREATE TABLE team_members (
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- Projects Table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    domain TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------
-- RLS POLICIES
---------------------------------------------------------

-- 1. Teams Policies
-- Users can view teams they are a member of
CREATE POLICY "View teams user belongs to" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = teams.id 
            AND team_members.user_id = auth.uid()
        )
    );

-- Any authenticated user can create a team
CREATE POLICY "Users can create teams" ON teams
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Only owners can update their teams
CREATE POLICY "Owners can update teams" ON teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = teams.id 
            AND team_members.user_id = auth.uid() 
            AND team_members.role = 'owner'
        )
    );

-- 2. Team Members Policies
-- Users can view members of teams they belong to
CREATE POLICY "View team members for associated teams" ON team_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_members tm 
            WHERE tm.team_id = team_members.team_id 
            AND tm.user_id = auth.uid()
        )
    );

-- Only owners can add/update/remove team members
CREATE POLICY "Owners can manage team members" ON team_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members tm 
            WHERE tm.team_id = team_members.team_id 
            AND tm.user_id = auth.uid() 
            AND tm.role = 'owner'
        )
    );

-- Allow users to insert themselves as owner when creating a new team
-- (This policy is necessary because when a user creates a team, they must also be able to insert their own membership)
CREATE POLICY "Users can add themselves to new teams" ON team_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND role = 'owner'
    );

-- 3. Projects Policies
-- Users can perform all actions on projects linked to their teams
CREATE POLICY "Team members can access projects" ON projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_members 
            WHERE team_members.team_id = projects.team_id 
            AND team_members.user_id = auth.uid()
        )
    );

-- 4. Tasks Policies
-- Users can perform all actions on tasks linked to their team's projects
CREATE POLICY "Team members can access tasks" ON tasks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM projects
            JOIN team_members ON team_members.team_id = projects.team_id
            WHERE projects.id = tasks.project_id
            AND team_members.user_id = auth.uid()
        )
    );

---------------------------------------------------------
-- HELPER FUNCTIONS / TRIGGERS
---------------------------------------------------------

-- Automatically add the creator of a team as the 'owner'
CREATE OR REPLACE FUNCTION public.handle_new_team() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_team();
