export type RuleItem = {
  label: string;
  value: string;
};

export type RosterRule = {
  maximum: string;
  position: string;
  starters: string;
};

export type ScoringGroup = {
  items: RuleItem[];
  title: string;
};

export const basicSettings: RuleItem[] = [
  { label: "League Name", value: "Lleyton's All stars" },
  { label: "Number of Teams", value: "12" },
  { label: "Scoring Type", value: "Head to Head Points, Point Per Reception" },
  { label: "Format", value: "League Manager" },
  { label: "Make League Viewable to Public", value: "No" },
  { label: "Auto Reactivate", value: "No" },
  { label: "Lineup Protection", value: "Off" },
];

export const draftSettings: RuleItem[] = [
  { label: "Draft Type", value: "Snake" },
  { label: "Draft Date", value: "Sep 6, 2026 @ 5:00 PM PDT" },
  { label: "Time Per Pick", value: "90 seconds" },
  { label: "Draft Order", value: "Randomized One Hour Prior to Draft Time" },
];

export const rosterSummary: RuleItem[] = [
  { label: "Roster Size", value: "16" },
  { label: "Total Starters", value: "9" },
  { label: "Total on Bench", value: "7 (1 IR)" },
];

export const rosterRules: RosterRule[] = [
  { position: "Quarterback (QB)", starters: "1", maximum: "4" },
  { position: "Team Quarterback (TQB)", starters: "0", maximum: "No Limit" },
  { position: "Running Back (RB)", starters: "2", maximum: "8" },
  { position: "Running Back/Wide Receiver (RB/WR)", starters: "0", maximum: "N/A" },
  { position: "Wide Receiver (WR)", starters: "2", maximum: "8" },
  { position: "Wide Receiver/Tight End (WR/TE)", starters: "0", maximum: "N/A" },
  { position: "Tight End (TE)", starters: "1", maximum: "3" },
  { position: "Flex (FLEX)", starters: "1", maximum: "N/A" },
  { position: "Offensive Player Utility (OP)", starters: "0", maximum: "N/A" },
  { position: "Defensive Tackle (DT)", starters: "0", maximum: "0" },
  { position: "Defensive End (DE)", starters: "0", maximum: "0" },
  { position: "Linebacker (LB)", starters: "0", maximum: "0" },
  { position: "Defensive Line (DL)", starters: "0", maximum: "N/A" },
  { position: "Cornerback (CB)", starters: "0", maximum: "0" },
  { position: "Safety (S)", starters: "0", maximum: "0" },
  { position: "Defensive Back (DB)", starters: "0", maximum: "N/A" },
  { position: "Defensive Player Utility (DP)", starters: "0", maximum: "N/A" },
  { position: "Team Defense/Special Teams (D/ST)", starters: "1", maximum: "3" },
  { position: "Place Kicker (K)", starters: "1", maximum: "3" },
  { position: "Punter (P)", starters: "0", maximum: "0" },
  { position: "Head Coach (HC)", starters: "0", maximum: "0" },
  { position: "Bench (BE)", starters: "7", maximum: "N/A" },
  { position: "Injured Reserve (IR)", starters: "1", maximum: "N/A" },
];

export const scoringGroups: ScoringGroup[] = [
  {
    title: "Passing",
    items: [
      { label: "Every 25 passing yards (PY25)", value: "1" },
      { label: "TD Pass (PTD)", value: "4" },
      { label: "50+ yard TD pass bonus (PTD50)", value: "1" },
      { label: "Interceptions Thrown (INT)", value: "-2" },
      { label: "2pt Passing Conversion (2PC)", value: "2" },
      { label: "300-399 yard passing game (P300)", value: "1" },
      { label: "400+ yard passing game (P400)", value: "2" },
    ],
  },
  {
    title: "Rushing",
    items: [
      { label: "Every 10 rushing yards (RY10)", value: "1" },
      { label: "TD Rush (RTD)", value: "6" },
      { label: "50+ yard TD rush bonus (RTD50)", value: "1" },
      { label: "2pt Rushing Conversion (2PR)", value: "2" },
      { label: "100-199 yard rushing game (RY100)", value: "1" },
      { label: "200+ yard rushing game (RY200)", value: "2" },
    ],
  },
  {
    title: "Receiving",
    items: [
      { label: "Every 10 receiving yards (REY10)", value: "1" },
      { label: "Each reception (REC)", value: "1" },
      { label: "TD Reception (RETD)", value: "6" },
      { label: "50+ yard TD rec bonus (RETD50)", value: "1" },
      { label: "2pt Receiving Conversion (2PRE)", value: "2" },
      { label: "100-199 yard receiving game (REY100)", value: "1" },
      { label: "200+ yard receiving game (REY200)", value: "2" },
    ],
  },
  {
    title: "Kicking",
    items: [
      { label: "Each PAT Made (PAT)", value: "1" },
      { label: "FG Made (0-39 yards) (FG0)", value: "3" },
      { label: "FG Made (40-49 yards) (FG40)", value: "4" },
      { label: "FG Missed (0-39 yards) (FGM0)", value: "-3" },
      { label: "FG Missed (40-49 yards) (FGM40)", value: "-2" },
      { label: "FG Missed (50-59 yards) (FGM50)", value: "-1" },
      { label: "FG Made (50-59 yards) (FG50)", value: "5" },
      { label: "FG Made (60+ yards) (FG60)", value: "6" },
      { label: "FG Missed (60+ yards) (FGM60)", value: "-1" },
    ],
  },
  {
    title: "Team Defense / Special Teams",
    items: [
      { label: "Every 10 kickoff return yards (KR10)", value: "1" },
      { label: "Every 10 punt return yards (PR10)", value: "1" },
      { label: "Kickoff Return TD (KRTD)", value: "6" },
      { label: "Punt Return TD (PRTD)", value: "6" },
      { label: "Interception Return TD (INTTD)", value: "6" },
      { label: "Fumble Return TD (FRTD)", value: "6" },
      { label: "Blocked Punt or FG return for TD (BLKKRTD)", value: "6" },
      { label: "2pt Return (2PTRET)", value: "2" },
      { label: "1pt Safety (1PSF)", value: "1" },
      { label: "Each Sack (SK)", value: "1" },
      { label: "Blocked Punt, PAT or FG (BLKK)", value: "2" },
      { label: "Each Interception (INT)", value: "2" },
      { label: "Each Fumble Recovered (FR)", value: "2" },
      { label: "Each Safety (SF)", value: "2" },
      { label: "0 points allowed (PA0)", value: "5" },
      { label: "1-6 points allowed (PA1)", value: "4" },
      { label: "7-13 points allowed (PA7)", value: "3" },
      { label: "14-17 points allowed (PA14)", value: "1" },
      { label: "28-34 points allowed (PA28)", value: "-1" },
      { label: "35-45 points allowed (PA35)", value: "-3" },
      { label: "46+ points allowed (PA46)", value: "-5" },
      { label: "Less than 100 total yards allowed (YA100)", value: "5" },
      { label: "100-199 total yards allowed (YA199)", value: "3" },
      { label: "200-299 total yards allowed (YA299)", value: "2" },
      { label: "350-399 total yards allowed (YA399)", value: "-1" },
      { label: "400-449 total yards allowed (YA449)", value: "-3" },
      { label: "450-499 total yards allowed (YA499)", value: "-5" },
      { label: "500-549 total yards allowed (YA549)", value: "-6" },
      { label: "550+ total yards allowed (YA550)", value: "-7" },
    ],
  },
  {
    title: "Miscellaneous",
    items: [
      { label: "Kickoff Return TD (KRTD)", value: "6" },
      { label: "Punt Return TD (PRTD)", value: "6" },
      { label: "Fumble Recovered for TD (FTD)", value: "6" },
      { label: "Total Fumbles Lost (FUML)", value: "-2" },
      { label: "Interception Return TD (INTTD)", value: "6" },
      { label: "Fumble Return TD (FRTD)", value: "6" },
      { label: "Blocked Punt or FG return for TD (BLKKRTD)", value: "6" },
      { label: "2pt Return (2PTRET)", value: "2" },
      { label: "1pt Safety (1PSF)", value: "1" },
    ],
  },
];

export const leagueRuleSections: Array<{ items: RuleItem[]; title: string }> = [
  {
    title: "Player Rules",
    items: [
      { label: "Observe ESPN's Undroppable Players List", value: "Yes" },
      { label: "Player Universe", value: "NFL" },
    ],
  },
  {
    title: "Acquisition and Waiver Rules",
    items: [
      { label: "Lineup Changes", value: "Lock individually at Scheduled Gametime" },
      { label: "Player Acquisition System", value: "Waivers" },
      { label: "Season Acquisition Limit", value: "No Limit" },
      { label: "Waiver Period", value: "1 Day" },
      { label: "Waiver Order", value: "Move to Last After Claim, Never Reset Order" },
      { label: "Lock Transactions for Eliminated Teams During Playoffs", value: "No" },
    ],
  },
  {
    title: "Trade Rules",
    items: [
      { label: "Trade Limit", value: "No Limit" },
      { label: "Trade Deadline", value: "No deadline" },
      { label: "Trade Review Period", value: "No Trade Review" },
    ],
  },
  {
    title: "Keepers Rules",
    items: [
      { label: "Use Keepers for 2026 Season", value: "No" },
      { label: "Use Keepers for 2027 Season", value: "No" },
    ],
  },
  {
    title: "Regular Season Setup",
    items: [
      { label: "Start of Regular Season", value: "NFL Week 1 (Start of Season)" },
      { label: "Weeks Per Matchup", value: "1" },
      { label: "Regular Season Matchups", value: "14" },
      { label: "Matchup Tie Breaker", value: "Most Bench points" },
      { label: "Home Field Advantage", value: "None" },
      { label: "Bonus Wins and Losses", value: "No" },
    ],
  },
  {
    title: "Playoff Bracket Setup",
    items: [
      { label: "Playoff Teams", value: "8" },
      { label: "Weeks In Round 1 Playoff Matchup", value: "1" },
      { label: "Weeks In Round 2 Playoff Matchup", value: "1" },
      { label: "Weeks In Championship Round", value: "1" },
      { label: "Playoff Seeding Tie Breaker", value: "Head to Head Record" },
      { label: "Playoff Home Field Advantage", value: "None" },
      { label: "Allow for Playoff Bracket Reseeding", value: "Off" },
      { label: "Lock Transactions for Eliminated Teams During Playoffs", value: "No" },
      { label: "To edit", value: "Go to Settings > Transactions and Keepers" },
      { label: "Consolation Ladder", value: "Yes" },
    ],
  },
];
