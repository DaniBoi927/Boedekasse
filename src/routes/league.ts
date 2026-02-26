import { Router } from 'express';
import { getPool } from '../db';
import { authMiddleware } from './auth';

const router = Router();

// Parse Rankedin HTML to extract standings and matches
function parseRankedinData(html: string, teamName: string): any {
  const standings: any[] = [];
  const matches: any[] = [];
  let poolName = '';

  // Extract pool name
  const poolMatch = html.match(/Pool:\s*([^<\n]+)/);
  if (poolMatch) {
    poolName = poolMatch[1].trim();
  }

  // Parse standings table - look for rows with team data
  // Format: | 1. | Team Name | 4 | 1 | 1 - 0 | 4 - 2 (2) | 10 - 6 (4) | 0 - 0 (0) |
  const standingsRegex = /\|\s*(\d+)\.\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*([\d\s\-]+)\s*\|\s*([\d\s\-()]+)\s*\|\s*([\d\s\-()]+)\s*\|\s*([\d\s\-()]+)\s*\|/g;
  let match;
  while ((match = standingsRegex.exec(html)) !== null) {
    const name = match[2].trim();
    standings.push({
      position: parseInt(match[1]),
      name: name,
      points: parseInt(match[3]),
      played: parseInt(match[4]),
      wins: match[5].trim(),
      sets: match[6].trim(),
      games: match[7].trim(),
      isCurrentTeam: name.toLowerCase() === teamName.toLowerCase()
    });
  }

  // Parse matches - look for Round X sections
  const roundRegex = /Round\s+(\d+)[^]*?(\d{2}\/\d{2}\/\d{4})[^]*?\[([^\]]+)\][^]*?vs[^]*?\[([^\]]+)\][^]*?(?:\[(\d+-\d+)\]|upcoming)/gi;
  let roundMatch;
  let currentRound = 0;
  
  // Simpler approach - split by "Round" and parse each section
  const roundSections = html.split(/Round\s+(\d+)/);
  for (let i = 1; i < roundSections.length; i += 2) {
    const roundNum = parseInt(roundSections[i]);
    const section = roundSections[i + 1];
    
    // Extract date
    const dateMatch = section.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) continue;
    const date = `${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
    
    // Extract time
    const timeMatch = section.match(/(\d{2}:\d{2})/);
    const time = timeMatch ? timeMatch[1] : '';
    
    // Extract teams - look for links with team names
    const teamsMatch = section.match(/\[([^\]]+)\]\([^)]+team[^)]+\)[^]*?vs[^]*?\[([^\]]+)\]\([^)]+team[^)]+\)/);
    if (!teamsMatch) continue;
    
    const homeTeam = teamsMatch[1].trim();
    const awayTeam = teamsMatch[2].trim();
    
    // Check for result
    const resultMatch = section.match(/\[(\d+-\d+)\]/);
    const result = resultMatch ? resultMatch[1] : null;
    const isUpcoming = section.includes('upcoming');
    
    // Extract location
    const locationMatch = section.match(/([^,]+,[^,]+,\s*\d{4}\s*[^,]+,\s*Danmark)/);
    const location = locationMatch ? locationMatch[1].trim() : '';
    
    const involvesCurrentTeam = 
      homeTeam.toLowerCase() === teamName.toLowerCase() || 
      awayTeam.toLowerCase() === teamName.toLowerCase();
    
    matches.push({
      round: roundNum,
      date,
      time,
      homeTeam,
      awayTeam,
      result,
      location,
      isUpcoming: isUpcoming || !result,
      involvesCurrentTeam
    });
  }

  return { poolName, standings, matches };
}

// Get league data for a team
router.get('/:teamId/league', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;

  try {
    const pool = await getPool();
    
    // Get team's rankedin settings
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
    
    if (!team.rankedin_url) {
      return res.status(404).json({ error: 'Liga ikke konfigureret' });
    }

    // Check if we need to refresh data (older than 1 hour or no data)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const needsRefresh = !team.league_data || 
      !team.league_updated_at || 
      new Date(team.league_updated_at) < oneHourAgo;

    let leagueData;
    
    if (needsRefresh) {
      // Fetch fresh data from Rankedin
      try {
        const response = await fetch(team.rankedin_url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        const html = await response.text();
        leagueData = parseRankedinData(html, team.rankedin_team_name);
        leagueData.lastUpdated = new Date().toISOString();
        leagueData.rankedinUrl = team.rankedin_url;
        leagueData.teamName = team.rankedin_team_name;

        // Cache the data
        await pool.request()
          .input('team_id', teamId)
          .input('league_data', JSON.stringify(leagueData))
          .input('league_updated_at', new Date())
          .query(`
            UPDATE teams 
            SET league_data = @league_data, league_updated_at = @league_updated_at
            WHERE id = @team_id
          `);
      } catch (fetchErr) {
        console.error('Rankedin fetch error:', fetchErr);
        // Fall back to cached data if available
        if (team.league_data) {
          leagueData = JSON.parse(team.league_data);
        } else {
          return res.status(500).json({ error: 'Kunne ikke hente liga data' });
        }
      }
    } else {
      leagueData = JSON.parse(team.league_data);
    }

    res.json(leagueData);
  } catch (err) {
    console.error('Get league error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Update league settings
router.put('/:teamId/league', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;
  const { rankedin_url, team_name } = req.body;
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

    // Update team settings
    await pool.request()
      .input('team_id', teamId)
      .input('rankedin_url', rankedin_url || null)
      .input('rankedin_team_name', team_name || null)
      .query(`
        UPDATE teams 
        SET rankedin_url = @rankedin_url, 
            rankedin_team_name = @rankedin_team_name,
            league_data = NULL,
            league_updated_at = NULL
        WHERE id = @team_id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Update league error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

// Force refresh league data
router.post('/:teamId/league/refresh', authMiddleware, async (req: any, res) => {
  const { teamId } = req.params;

  try {
    const pool = await getPool();
    
    // Clear cached data to force refresh
    await pool.request()
      .input('team_id', teamId)
      .query(`
        UPDATE teams 
        SET league_updated_at = NULL
        WHERE id = @team_id
      `);

    res.json({ success: true });
  } catch (err) {
    console.error('Refresh league error:', err);
    res.status(500).json({ error: 'Server fejl' });
  }
});

export default router;
