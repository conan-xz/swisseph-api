const express = require('express');
const crypto = require('crypto');
const db = require('../services/db');
const chartService = require('../services/chart');
const synastryService = require('../services/synastry');
const { authRequired, getOptionalAuth } = require('../middleware/auth');

const router = express.Router();

function validateProfile(profile) {
  if (!profile) {
    throw new Error('profile is required');
  }
  if (!profile.birthDate) {
    throw new Error('birthDate is required');
  }
  if (!profile.location || typeof profile.location.lat !== 'number' || typeof profile.location.lng !== 'number') {
    throw new Error('location.lat and location.lng are required');
  }
}

function buildChartParamsFromProfile(profile, houseSystem) {
  const [year, month, day] = profile.birthDate.split('-').map(Number);
  let hour = 12;
  let minute = 0;

  if (profile.birthTime && /^\d{2}:\d{2}$/.test(profile.birthTime)) {
    [hour, minute] = profile.birthTime.split(':').map(Number);
  }

  return {
    year,
    month,
    day,
    hour,
    minute,
    lat: profile.location.lat,
    lng: profile.location.lng,
    houseSystem: houseSystem || 'placidus',
    timeZone: profile.timeZone || 8
  };
}

function buildProfileRecord(ownerOpenid, profile, chartSnapshot, preview, source) {
  return {
    id: crypto.randomUUID(),
    ownerOpenid,
    source: source || 'self',
    birthDate: profile.birthDate,
    birthTime: profile.birthTime || null,
    timeKnown: !!profile.timeKnown,
    timeUncertainty: profile.timeUncertainty || null,
    locationName: profile.location.name || profile.location.city || profile.locationName || '未知地点',
    lat: profile.location.lat,
    lng: profile.location.lng,
    timeZone: profile.timeZone || 8,
    chartSnapshot,
    preview
  };
}

async function insertProfile(client, profileRecord) {
  await client.query(
    `
      INSERT INTO profiles (
        id, owner_openid, source, birth_date, birth_time, time_known, time_uncertainty,
        location_name, lat, lng, time_zone, chart_snapshot, preview_json, created_at
      )
      VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, NOW())
    `,
    [
      profileRecord.id,
      profileRecord.ownerOpenid,
      profileRecord.source,
      profileRecord.birthDate,
      profileRecord.birthTime,
      profileRecord.timeKnown,
      profileRecord.timeUncertainty,
      profileRecord.locationName,
      profileRecord.lat,
      profileRecord.lng,
      profileRecord.timeZone,
      JSON.stringify(profileRecord.chartSnapshot),
      JSON.stringify(profileRecord.preview)
    ]
  );
}

function mapInviteRow(row, includeReportId) {
  return {
    id: row.id,
    inviteCode: row.invite_code,
    relationType: row.relation_type,
    message: row.message,
    status: row.status,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    createdAt: row.created_at,
    inviterPreview: row.preview_json,
    inviterName: row.inviter_nick_name || null,
    reportId: includeReportId ? row.report_id : null
  };
}

router.post('/invites', authRequired, async function createInvite(req, res) {
  try {
    await db.initializeDatabase();
    const { relationType = 'love', message = '', profile, houseSystem = 'placidus' } = req.body;
    validateProfile(profile);

    const inviterChart = chartService.generateBirthChart(buildChartParamsFromProfile(profile, houseSystem));
    const inviterPreview = synastryService.getPreviewFromChart(inviterChart, 'TA');
    const inviteCode = synastryService.makeInviteCode();

    const result = await db.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO users (openid, created_at, last_login_at)
          VALUES ($1, NOW(), NOW())
          ON CONFLICT (openid)
          DO UPDATE SET last_login_at = NOW()
        `,
        [req.auth.openid]
      );

      const profileRecord = buildProfileRecord(
        req.auth.openid,
        profile,
        inviterChart,
        inviterPreview,
        'self'
      );

      await insertProfile(client, profileRecord);

      const inviteId = crypto.randomUUID();
      await client.query(
        `
          INSERT INTO synastry_invites (
            id, invite_code, inviter_openid, inviter_profile_id, relation_type, message, status, expires_at, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW() + INTERVAL '7 days', NOW())
        `,
        [inviteId, inviteCode, req.auth.openid, profileRecord.id, relationType, message]
      );

      const inviterRow = await client.query(
        'SELECT nick_name FROM users WHERE openid = $1 LIMIT 1',
        [req.auth.openid]
      );

      return {
        inviteId,
        inviteCode,
        inviterPreview,
        inviterName: inviterRow.rows[0]?.nick_name || null
      };
    });

    return res.json({
      success: true,
      data: {
        inviteCode: result.inviteCode,
        inviteUrl: `/pages/synastry/synastry?inviteCode=${result.inviteCode}`,
        inviterPreview: result.inviterPreview,
        inviterName: result.inviterName
      }
    });
  } catch (error) {
    console.error('Create synastry invite error:', error);
    return res.status(400).json({
      error: 'Failed to create invite',
      message: error.message,
      code: 'INVITE_CREATE_FAILED'
    });
  }
});

router.get('/invites/:code', getOptionalAuth, async function getInvite(req, res) {
  try {
    await db.initializeDatabase();
    const result = await db.query(
      `
        SELECT invites.*, profiles.preview_json, inviter_user.nick_name AS inviter_nick_name
        FROM synastry_invites AS invites
        JOIN profiles ON profiles.id = invites.inviter_profile_id
        LEFT JOIN users AS inviter_user ON inviter_user.openid = invites.inviter_openid
        WHERE invites.invite_code = $1
        LIMIT 1
      `,
      [req.params.code]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Invite not found',
        code: 'INVITE_NOT_FOUND'
      });
    }

    const row = result.rows[0];
    const isParticipant = !!req.auth && (req.auth.openid === row.inviter_openid || req.auth.openid === row.accepted_openid);

    return res.json({
      success: true,
      data: mapInviteRow(row, isParticipant)
    });
  } catch (error) {
    console.error('Get synastry invite error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.post('/invites/:code/accept', authRequired, async function acceptInvite(req, res) {
  try {
    await db.initializeDatabase();
    const { profile, houseSystem = 'placidus' } = req.body;
    validateProfile(profile);

    const inviteQuery = await db.query(
      `
        SELECT invites.*,
          inviter_profiles.chart_snapshot AS inviter_chart_snapshot,
          inviter_profiles.preview_json AS inviter_preview,
          inviter_user.nick_name AS inviter_nick_name
        FROM synastry_invites AS invites
        JOIN profiles AS inviter_profiles ON inviter_profiles.id = invites.inviter_profile_id
        LEFT JOIN users AS inviter_user ON inviter_user.openid = invites.inviter_openid
        WHERE invites.invite_code = $1
        LIMIT 1
      `,
      [req.params.code]
    );

    if (!inviteQuery.rows.length) {
      return res.status(404).json({
        error: 'Invite not found',
        code: 'INVITE_NOT_FOUND'
      });
    }

    const invite = inviteQuery.rows[0];
    if (invite.status === 'accepted' && invite.report_id) {
      return res.json({
        success: true,
        data: {
          reportId: invite.report_id
        }
      });
    }

    if (invite.inviter_openid === req.auth.openid) {
      return res.status(400).json({
        error: 'Inviter cannot accept own invite',
        code: 'INVITE_SELF_ACCEPT'
      });
    }

    if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
      return res.status(400).json({
        error: 'Invite expired',
        code: 'INVITE_EXPIRED'
      });
    }

    const inviteeChart = chartService.generateBirthChart(buildChartParamsFromProfile(profile, houseSystem));
    const inviterChart = invite.inviter_chart_snapshot;
    const inviteePreview = synastryService.getPreviewFromChart(inviteeChart, profile.name || 'TA');

    const accepterRow = await db.query(
      'SELECT nick_name FROM users WHERE openid = $1 LIMIT 1',
      [req.auth.openid]
    );
    const inviterName = invite.inviter_nick_name || 'A';
    const accepterName = accepterRow.rows[0]?.nick_name || 'B';

    const report = synastryService.generateSynastryReport(inviterChart, inviteeChart, invite.relation_type, {
      personALabel: inviterName,
      personBLabel: accepterName,
      timeKnownA: true,
      timeKnownB: !!profile.timeKnown
    });

    const writeResult = await db.withTransaction(async (client) => {
      await client.query(
        `
          INSERT INTO users (openid, created_at, last_login_at)
          VALUES ($1, NOW(), NOW())
          ON CONFLICT (openid)
          DO UPDATE SET last_login_at = NOW()
        `,
        [req.auth.openid]
      );

      const inviteeProfile = buildProfileRecord(
        req.auth.openid,
        profile,
        inviteeChart,
        inviteePreview,
        'invite_accept'
      );

      await insertProfile(client, inviteeProfile);

      const reportId = crypto.randomUUID();
      await client.query(
        `
          INSERT INTO synastry_reports (
            id, invite_id, person_a_openid, person_b_openid, person_a_profile_id, person_b_profile_id,
            relation_type, score_total, report_json, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, NOW())
        `,
        [
          reportId,
          invite.id,
          invite.inviter_openid,
          req.auth.openid,
          invite.inviter_profile_id,
          inviteeProfile.id,
          invite.relation_type,
          report.totalScore,
          JSON.stringify(report)
        ]
      );

      await client.query(
        `
          UPDATE synastry_invites
          SET status = 'accepted',
              accepted_openid = $1,
              accepted_profile_id = $2,
              accepted_at = NOW(),
              report_id = $3
          WHERE id = $4
        `,
        [req.auth.openid, inviteeProfile.id, reportId, invite.id]
      );

      return {
        reportId
      };
    });

    return res.json({
      success: true,
      data: writeResult
    });
  } catch (error) {
    console.error('Accept synastry invite error:', error);
    return res.status(400).json({
      error: 'Failed to accept invite',
      message: error.message,
      code: 'INVITE_ACCEPT_FAILED'
    });
  }
});

router.get('/reports/:id', authRequired, async function getReport(req, res) {
  try {
    await db.initializeDatabase();
    const result = await db.query(
      `
        SELECT *
        FROM synastry_reports
        WHERE id = $1
          AND ($2 = person_a_openid OR $2 = person_b_openid)
        LIMIT 1
      `,
      [req.params.id, req.auth.openid]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: 'Report not found',
        code: 'REPORT_NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      data: {
        id: result.rows[0].id,
        relationType: result.rows[0].relation_type,
        scoreTotal: result.rows[0].score_total,
        report: result.rows[0].report_json,
        createdAt: result.rows[0].created_at
      }
    });
  } catch (error) {
    console.error('Get synastry report error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.get('/my/invites', authRequired, async function myInvites(req, res) {
  try {
    await db.initializeDatabase();
    const result = await db.query(
      `
        SELECT invites.*, profiles.preview_json, inviter_user.nick_name AS inviter_nick_name
        FROM synastry_invites AS invites
        JOIN profiles ON profiles.id = invites.inviter_profile_id
        LEFT JOIN users AS inviter_user ON inviter_user.openid = invites.inviter_openid
        WHERE invites.inviter_openid = $1
        ORDER BY invites.created_at DESC
        LIMIT 20
      `,
      [req.auth.openid]
    );

    return res.json({
      success: true,
      data: result.rows.map((row) => mapInviteRow(row, true))
    });
  } catch (error) {
    console.error('List synastry invites error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

router.get('/my/reports', authRequired, async function myReports(req, res) {
  try {
    await db.initializeDatabase();
    const result = await db.query(
      `
        SELECT id, relation_type, score_total, created_at
        FROM synastry_reports
        WHERE person_a_openid = $1 OR person_b_openid = $1
        ORDER BY created_at DESC
        LIMIT 20
      `,
      [req.auth.openid]
    );

    return res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('List synastry reports error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router;
