-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.team_join_requests CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Create tables
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    join_code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'editor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

CREATE TABLE public.team_join_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(team_id, user_id)
);

CREATE TABLE public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Enable Realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Function to avoid infinite recursion when querying team_members
CREATE OR REPLACE FUNCTION public.get_user_teams()
RETURNS SETOF UUID AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are a member of"
    ON public.teams FOR SELECT
    USING ( id IN (SELECT public.get_user_teams()) );

CREATE POLICY "Authenticated users can create teams"
    ON public.teams FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Function to check if user is owner of team
CREATE OR REPLACE FUNCTION public.get_user_owned_teams()
RETURNS SETOF UUID AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner';
$$ LANGUAGE sql SECURITY DEFINER;

-- RLS Policies for team_members
CREATE POLICY "Users can view members of their teams"
    ON public.team_members FOR SELECT
    USING ( team_id IN (SELECT public.get_user_teams()) );

CREATE POLICY "Team owners can insert members"
    ON public.team_members FOR INSERT
    TO authenticated
    WITH CHECK ( team_id IN (SELECT public.get_user_owned_teams()) );

-- Trigger to add creator as owner
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
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();

-- RLS Policies for team_join_requests
CREATE POLICY "Users can insert their own join requests" 
    ON public.team_join_requests FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own join requests" 
    ON public.team_join_requests FOR SELECT 
    TO authenticated 
    USING (auth.uid() = user_id);

CREATE POLICY "Team owners can view join requests for their teams" 
    ON public.team_join_requests FOR SELECT 
    TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = team_join_requests.team_id AND team_members.user_id = auth.uid() AND team_members.role = 'owner')
    );

CREATE POLICY "Team owners can update join requests" 
    ON public.team_join_requests FOR UPDATE 
    TO authenticated 
    USING (
        EXISTS (SELECT 1 FROM public.team_members WHERE team_members.team_id = team_join_requests.team_id AND team_members.user_id = auth.uid() AND team_members.role = 'owner')
    );

-- RLS Policies for messages
CREATE POLICY "Team members can insert messages" 
    ON public.messages FOR INSERT 
    TO authenticated 
    WITH CHECK ( team_id IN (SELECT public.get_user_teams()) );

CREATE POLICY "Team members can view messages" 
    ON public.messages FOR SELECT 
    TO authenticated 
    USING ( team_id IN (SELECT public.get_user_teams()) );

-- RLS Policies for documents
CREATE POLICY "Team members can insert documents" 
    ON public.documents FOR INSERT 
    TO authenticated 
    WITH CHECK ( team_id IN (SELECT public.get_user_teams()) );

CREATE POLICY "Team members can view documents" 
    ON public.documents FOR SELECT 
    TO authenticated 
    USING ( team_id IN (SELECT public.get_user_teams()) );

-- RLS Policies for projects
CREATE POLICY "Users can view projects for their teams"
    ON public.projects FOR SELECT
    USING ( team_id IN (SELECT public.get_user_teams()) );

CREATE POLICY "Users can insert projects for their teams"
    ON public.projects FOR INSERT
    WITH CHECK ( team_id IN (SELECT public.get_user_teams()) );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for their teams projects"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.team_id IN (SELECT public.get_user_teams()))
    );

CREATE POLICY "Users can insert tasks for their teams projects"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_id AND projects.team_id IN (SELECT public.get_user_teams()))
    );

CREATE POLICY "Users can update tasks for their teams projects"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (SELECT 1 FROM public.projects WHERE projects.id = tasks.project_id AND projects.team_id IN (SELECT public.get_user_teams()))
    );
