-- 1. Drop existing policies on team_members to prevent recursion
DROP POLICY IF EXISTS "Users can view members of their teams" ON public.team_members;
DROP POLICY IF EXISTS "Team owners can insert members" ON public.team_members;

-- 2. Create the get_user_owned_teams function
CREATE OR REPLACE FUNCTION public.get_user_owned_teams()
RETURNS SETOF UUID AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid() AND role = 'owner';
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. Recreate the SELECT policy using get_user_teams
CREATE POLICY "Users can view members of their teams"
    ON public.team_members FOR SELECT
    USING ( team_id IN (SELECT public.get_user_teams()) );

-- 4. Recreate the INSERT policy using get_user_owned_teams (for when owners approve requests)
CREATE POLICY "Team owners can insert members"
    ON public.team_members FOR INSERT
    TO authenticated
    WITH CHECK ( team_id IN (SELECT public.get_user_owned_teams()) );

-- 5. Create a trigger to automatically insert the team creator as an owner
CREATE OR REPLACE FUNCTION public.handle_new_team() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.team_members (team_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_team_created ON public.teams;
CREATE TRIGGER on_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_team();
