import { Request } from 'express';
import { prisma } from '../config/database.js';
import { getClientIp, resolveGeoLocation, resolveGeoLocationAsync } from '../utils/geo.js';

export interface AuditLogInput {
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  tenant_org_id?: string | null;
  session_id?: string | null;
  auth_method?: string | null;
  action: string;
  resource?: string | null;
  method: string;
  endpoint: string;
  status_code?: number;
  response_time_ms?: number;
  ip_address: string;
  user_agent?: string | null;
  device_type?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  country_code?: string | null;
  before_state?: any;
  after_state?: any;
  request_body?: any;
  query_params?: any;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomaly_flags?: string[];
}

/**
 * Parse client device agent (Desktop / Laptop, Mobile, Tablet, Bot)
 */
export function parseDeviceType(userAgent?: string | null): 'Desktop' | 'Mobile' | 'Tablet' | 'Bot' {
  if (!userAgent) return 'Desktop';
  const ua = userAgent.toLowerCase();
  if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || ua.includes('postman') || ua.includes('curl')) {
    return 'Bot';
  }
  if (ua.includes('ipad') || ua.includes('tablet') || (ua.includes('android') && !ua.includes('mobile'))) {
    return 'Tablet';
  }
  if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android') || ua.includes('phone')) {
    return 'Mobile';
  }
  return 'Desktop';
}

/**
 * Cyber Threat & Security Anomaly Detector
 */
export function analyzeCyberThreats(req: Request, statusCode: number = 200): {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  anomaly_flags: string[];
} {
  const flags: string[] = [];
  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';

  const fullUrl = (req.originalUrl || req.url || '').toLowerCase();
  const bodyStr = req.body ? JSON.stringify(req.body).toLowerCase() : '';
  const queryStr = req.query ? JSON.stringify(req.query).toLowerCase() : '';
  const payload = `${fullUrl} ${queryStr} ${bodyStr}`;

  // 1. SQL Injection Detection Pattern
  const sqliPatterns = ['union select', "' or 1=1", '" or 1=1', 'drop table', 'information_schema', '; select', '--', '/*'];
  if (sqliPatterns.some(p => payload.includes(p))) {
    flags.push('SQLI_PATTERN_DETECTED');
    riskLevel = 'CRITICAL';
  }

  // 2. XSS Attack Detection Pattern
  const xssPatterns = ['<script', 'javascript:', 'onload=', 'onerror=', '<iframe', 'document.cookie', 'eval('];
  if (xssPatterns.some(p => payload.includes(p))) {
    flags.push('XSS_PAYLOAD_DETECTED');
    if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
  }

  // 3. Path Traversal Pattern
  if (payload.includes('../') || payload.includes('..\\') || payload.includes('/etc/passwd')) {
    flags.push('PATH_TRAVERSAL_ATTEMPT');
    if (riskLevel !== 'CRITICAL') riskLevel = 'HIGH';
  }

  // 4. Unauthorized Access / Forbidden Event
  if (statusCode === 401) {
    flags.push('UNAUTHORIZED_AUTHENTICATION_FAIL');
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  } else if (statusCode === 403) {
    flags.push('FORBIDDEN_RESOURCE_ACCESS');
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  }

  // 5. System Server Error Event
  if (statusCode >= 500) {
    flags.push('SERVER_FAULT_5XX');
    if (riskLevel === 'LOW') riskLevel = 'MEDIUM';
  }

  return { risk_level: riskLevel, anomaly_flags: flags };
}

/**
 * Persist Audit Entry into Database
 */
export async function createAuditLog(input: AuditLogInput): Promise<any> {
  try {
    const geo = input.ip_address ? await resolveGeoLocationAsync(input.ip_address) : null;
    const deviceType = input.device_type || parseDeviceType(input.user_agent);

    const auditData = {
      user_id: input.user_id || null,
      user_email: input.user_email || null,
      user_role: input.user_role || 'guest',
      tenant_org_id: input.tenant_org_id || null,
      session_id: input.session_id || null,
      auth_method: input.auth_method || 'JWT_BEARER',
      action: input.action,
      resource: input.resource || null,
      method: input.method || 'GET',
      endpoint: input.endpoint,
      status_code: input.status_code || 200,
      response_time_ms: input.response_time_ms || 0,
      ip_address: input.ip_address,
      user_agent: input.user_agent ? input.user_agent.substring(0, 500) : null,
      device_type: deviceType,
      latitude: input.latitude !== undefined && input.latitude !== null ? input.latitude : (geo?.latitude || 13.0827),
      longitude: input.longitude !== undefined && input.longitude !== null ? input.longitude : (geo?.longitude || 80.2707),
      city: input.city || geo?.city || 'Chennai',
      country: input.country || geo?.country || 'India',
      country_code: input.country_code || geo?.country_code || 'IN',
      before_state: input.before_state ? JSON.stringify(input.before_state) : null,
      after_state: input.after_state ? JSON.stringify(input.after_state) : null,
      request_body: input.request_body ? JSON.stringify(input.request_body).substring(0, 1000) : null,
      query_params: input.query_params ? JSON.stringify(input.query_params).substring(0, 500) : null,
      risk_level: input.risk_level || 'LOW',
      anomaly_flags: input.anomaly_flags && input.anomaly_flags.length > 0 ? JSON.stringify(input.anomaly_flags) : null,
    };

    // Safely write to Prisma database
    if ((prisma as any).auditLog) {
      return await (prisma as any).auditLog.create({ data: auditData });
    } else {
      // Fallback SQL insertion
      await prisma.$executeRawUnsafe(
        `INSERT INTO "audit_log" (id, user_id, user_email, user_role, tenant_org_id, session_id, auth_method, action, resource, method, endpoint, status_code, response_time_ms, ip_address, user_agent, device_type, latitude, longitude, city, country, country_code, before_state, after_state, request_body, query_params, risk_level, anomaly_flags, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, NOW())`,
        auditData.user_id,
        auditData.user_email,
        auditData.user_role,
        auditData.tenant_org_id,
        auditData.session_id,
        auditData.auth_method,
        auditData.action,
        auditData.resource,
        auditData.method,
        auditData.endpoint,
        auditData.status_code,
        auditData.response_time_ms,
        auditData.ip_address,
        auditData.user_agent,
        auditData.device_type,
        auditData.latitude,
        auditData.longitude,
        auditData.city,
        auditData.country,
        auditData.country_code,
        auditData.before_state,
        auditData.after_state,
        auditData.request_body,
        auditData.query_params,
        auditData.risk_level,
        auditData.anomaly_flags
      );
    }
  } catch (err) {
    console.error('⚠️ Failed to persist audit log entry:', err);
  }
}

/**
 * Log Entity State Change (Before vs After diff tracking)
 */
export async function logEntityStateChange(
  req: Request,
  opts: {
    action: string;
    resource: string;
    beforeState?: any;
    afterState?: any;
  }
): Promise<void> {
  const ip = getClientIp(req);
  const user = (req as any).user;
  const threat = analyzeCyberThreats(req, 200);

  await createAuditLog({
    user_id: user?.id || null,
    user_email: user?.email || null,
    user_role: user?.role_name || user?.role || 'user',
    tenant_org_id: user?.organization_id || null,
    action: opts.action,
    resource: opts.resource,
    method: req.method,
    endpoint: req.originalUrl || req.url,
    status_code: 200,
    ip_address: ip,
    user_agent: req.headers['user-agent'] || null,
    before_state: opts.beforeState,
    after_state: opts.afterState,
    risk_level: threat.risk_level,
    anomaly_flags: threat.anomaly_flags,
  });
}
