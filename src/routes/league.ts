import { Router } from 'express';
import { getPool } from '../db';
import { authMiddleware } from './auth';

const router = Router();

// Get league data for a team
router.get('/:teamId/league', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;

  try {
    const pool = await getPool();
    
    // Get team's league settings
    const result = await pool.request()
      .input('team_id', teamId)
      .query(`
        SELECT rankedin_url, rankedin_team_name, league_data, league_updated_at
        FROM teams
        WHERE id = @team_id
      `);

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: 'Team ikke fundet' });
    }

    const team = result.recordset[0];
    
    if (!team.league_data && !team.rankedin_url) {
      return res.status(404).json({ error: 'Liga ikke konfigureret' });
    }

    let leagueData = team.league_data ? JSON.parse(team.league_data) : {
      poolName: '',
      standings: [],
      matches: [],
      lastUpdated: null
    };
    
    leagueData.rankedinUrl = team.rankedin_url;
    leagueData.teamName = team.rankedin_team_name;
    
    res.json(leagueData);
  } catch (err) {
    console.error('Get league error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Update league settings (URL and team name)
router.put('/:teamId/league', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const { rankedin_url, team_name, poolName } = req.body;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if user is formand
    const memberCheck = await pool.request()
      .input('team_id', teamId)
      .input('user_id', userId)
      .query(`
        SELECT role FROM team_members 
        WHERE team_id = @team_id AND user_id = @user_id
      `);

    if (memberCheck.recordset.length === 0 || memberCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formænd kan ændre liga-indstillinger' });
    }

    // Get existing data
    const existingResult = await pool.request()
      .input('team_id', teamId)
      .query(`SELECT league_data FROM teams WHERE id = @team_id`);

    let leagueData = existingResult.recordset[0]?.league_data 
      ? JSON.parse(existingResult.recordset[0].league_data)
      : { poolName: '', standings: [], matches: [], lastUpdated: null };

    if (poolName !== undefined) {
      leagueData.poolName = poolName;
      leagueData.lastUpdated = new Date().toISOString();
    }

    // Update team settings
    await pool.request()
      .input('team_id', teamId)
      .input('rankedin_url', rankedin_url || null)
      .input('rankedin_team_name', team_name || null)
      .input('league_data', JSON.stringify(leagueData))
      .input('league_updated_at', new Date())
      .query(`
        UPDATE teams 
        SET rankedin_url = @rankedin_url, 
            rankedin_team_name = @rankedin_team_name,
            league_data = @league_data,
            league_updated_at = @league_updated_at
        WHERE id = @team_id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Update league error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Add or update a standing entry
router.post('/:teamId/league/standing', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const { position, name, points, played, wins, sets, games, isCurrentTeam } = req.body;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if user is formand
    const memberCheck = await pool.request()
      .input('team_id', teamId)
      .input('user_id', userId)
      .query(`
        SELECT role FROM team_members 
        WHERE team_id = @team_id AND user_id = @user_id
      `);

    if (memberCheck.recordset.length === 0 || memberCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formænd kan ændre liga-data' });
    }

    // Get current data
    const result = await pool.request()
      .input('team_id', teamId)
      .query(`SELECT league_data FROM teams WHERE id = @team_id`);

    let leagueData = result.recordset[0]?.league_data 
      ? JSON.parse(result.recordset[0].league_data)
      : { poolName: '', standings: [], matches: [], lastUpdated: null };

    // Add or update standing
    const existingIndex = leagueData.standings.findIndex((s: any) => s.position === position);
    const standing = { position, name, points: points || 0, played: played || 0, wins: wins || '0-0', sets: sets || '0-0', games: games || '0-0', isCurrentTeam: isCurrentTeam || false };
    
    if (existingIndex >= 0) {
      leagueData.standings[existingIndex] = standing;
    } else {
      leagueData.standings.push(standing);
    }
    
    leagueData.standings.sort((a: any, b: any) => a.position - b.position);
    leagueData.lastUpdated = new Date().toISOString();

    // Save
    await pool.request()
      .input('team_id', teamId)
      .input('league_data', JSON.stringify(leagueData))
      .input('league_updated_at', new Date())
      .query(`
        UPDATE teams 
        SET league_data = @league_data, league_updated_at = @league_updated_at
        WHERE id = @team_id
      `);

    res.json({ success: true, standings: leagueData.standings });
  } catch (err) {
    console.error('Add standing error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Delete a standing entry
router.delete('/:teamId/league/standing/:position', authMiddleware, async (req: any, res) => {
  const { teamId, position } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if user is formand
    const memberCheck = await pool.request()
      .input('team_id', teamId)
      .input('user_id', userId)
      .query(`
        SELECT role FROM team_members 
        WHERE team_id = @team_id AND user_id = @user_id
      `);

    if (memberCheck.recordset.length === 0 || memberCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formænd kan ændre liga-data' });
    }

    // Get current data
    const result = await pool.request()
      .input('team_id', teamId)
      .query(`SELECT league_data FROM teams WHERE id = @team_id`);

    let leagueData = result.recordset[0]?.league_data 
      ? JSON.parse(result.recordset[0].league_data)
      : { poolName: '', standings: [], matches: [], lastUpdated: null };

    // Remove standing
    leagueData.standings = leagueData.standings.filter((s: any) => s.position !== parseInt(position));
    leagueData.lastUpdated = new Date().toISOString();

    // Save
    await pool.request()
      .input('team_id', teamId)
      .input('league_data', JSON.stringify(leagueData))
      .input('league_updated_at', new Date())
      .query(`
        UPDATE teams 
        SET league_data = @league_data, league_updated_at = @league_updated_at
        WHERE id = @team_id
      `);

    res.json({ success: true, standings: leagueData.standings });
  } catch (err) {
    console.error('Delete standing error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Add a match
router.post('/:teamId/league/match', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const matchData = req.body;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if user is formand
    const memberCheck = await pool.request()
      .input('team_id', teamId)
      .input('user_id', userId)
      .query(`
        SELECT role FROM team_members 
        WHERE team_id = @team_id AND user_id = @user_id
      `);

    if (memberCheck.recordset.length === 0 || memberCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formænd kan ændre liga-data' });
    }

    // Get current data and team name
    const result = await pool.request()
      .input('team_id', teamId)
      .query(`SELECT league_data, rankedin_team_name FROM teams WHERE id = @team_id`);

    let leagueData = result.recordset[0]?.league_data 
      ? JSON.parse(result.recordset[0].league_data)
      : { poolName: '', standings: [], matches: [], lastUpdated: null };

    const teamName = result.recordset[0]?.rankedin_team_name || '';

    // Create match with ID
    const match = { 
      id: Date.now(),
      round: matchData.round || 0, 
      date: matchData.date || '', 
      time: matchData.time || '', 
      homeTeam: matchData.homeTeam || '', 
      awayTeam: matchData.awayTeam || '', 
      result: matchData.result || null, 
      location: matchData.location || '',
      isUpcoming: matchData.isUpcoming !== false && !matchData.result,
      involvesCurrentTeam: matchData.homeTeam?.toLowerCase() === teamName?.toLowerCase() || 
                          matchData.awayTeam?.toLowerCase() === teamName?.toLowerCase()
    };
    
    leagueData.matches.push(match);
    leagueData.matches.sort((a: any, b: any) => a.round - b.round);
    leagueData.lastUpdated = new Date().toISOString();

    // Save
    await pool.request()
      .input('team_id', teamId)
      .input('league_data', JSON.stringify(leagueData))
      .input('league_updated_at', new Date())
      .query(`
        UPDATE teams 
        SET league_data = @league_data, league_updated_at = @league_updated_at
        WHERE id = @team_id
      `);

    res.json({ success: true, matches: leagueData.matches });
  } catch (err) {
    console.error('Add match error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Delete a match
router.delete('/:teamId/league/match/:matchId', authMiddleware, async (req: any, res) => {
  const { teamId, matchId } = req.params;
  const userId = req.userId;

  try {
    const pool = await getPool();

    // Check if user is formand
    const memberCheck = await pool.request()
      .input('team_id', teamId)
      .input('user_id', userId)
      .query(`
        SELECT role FROM team_members 
        WHERE team_id = @team_id AND user_id = @user_id
      `);

    if (memberCheck.recordset.length === 0 || memberCheck.recordset[0].role !== 'formand') {
      return res.status(403).json({ error: 'Kun formænd kan ændre liga-data' });
    }

    // Get current data
    const result = await pool.request()
      .input('team_id', teamId)
      .query(`SELECT league_data FROM teams WHERE id = @team_id`);

    let leagueData = result.recordset[0]?.league_data 
      ? JSON.parse(result.recordset[0].league_data)
      : { poolName: '', standings: [], matches: [], lastUpdated: null };

    // Remove match
    leagueData.matches = leagueData.matches.filter((m: any) => m.id !== parseInt(matchId));
    leagueData.lastUpdated = new Date().toISOString();

    // Save
    await pool.request()
      .input('team_id', teamId)
      .input('league_data', JSON.stringify(leagueData))
      .input('league_updated_at', new Date())
      .query(`
        UPDATE teams 
        SET league_data = @league_data, league_updated_at = @league_updated_at
        WHERE id = @team_id
      `);

    res.json({ success: true, matches: leagueData.matches });
  } catch (err) {
    console.error('Delete match error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

export default router;
