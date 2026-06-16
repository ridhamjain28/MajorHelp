-- Create tables
CREATE TABLE public.teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
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
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Users can view teams they are a member of"
    ON public.teams FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = teams.id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can create teams"
    ON public.teams FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for team_members
CREATE POLICY "Users can view members of their teams"
    ON public.team_members FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members tm
            WHERE tm.team_id = team_members.team_id
            AND tm.user_id = auth.uid()
        )
    );

-- Trigger to automatically add the creator as a team owner
CREATE OR REPLACE FUNCTION public.handle_new_team()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (new.id, auth.uid(), 'owner');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();

-- RLS Policies for projects
CREATE POLICY "Users can view projects for their teams"
    ON public.projects FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = projects.team_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert projects for their teams"
    ON public.projects FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.team_members
            WHERE team_members.team_id = team_id
            AND team_members.user_id = auth.uid()
        )
    );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for their teams projects"
    ON public.tasks FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            JOIN public.team_members ON team_members.team_id = projects.team_id
            WHERE projects.id = tasks.project_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert tasks for their teams projects"
    ON public.tasks FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects
            JOIN public.team_members ON team_members.team_id = projects.team_id
            WHERE projects.id = project_id
            AND team_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update tasks for their teams projects"
    ON public.tasks FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.projects
            JOIN public.team_members ON team_members.team_id = projects.team_id
            WHERE projects.id = tasks.project_id
            AND team_members.user_id = auth.uid()
        )
    );
