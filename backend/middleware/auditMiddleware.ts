import { Request, Response, NextFunction } from 'express';
import { getClientIp, resolveGeoLocation } from '../utils/geo.js';
import { createAuditLog, analyzeCyberThreats } from '../services/auditLogger.js';

export function auditMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip non-API background polling if necessary
  const path = req.originalUrl || req.url || '';
  if (path.includes('/health') && req.method === 'GET') {
    next();
    return;
  }

  const startTime = Date.now();
  const clientIp = getClientIp(req);
  const geo = resolveGeoLocation(clientIp);

  // Hook into response finish event to capture final status code & duration
  res.on('finish', () => {
    const responseTimeMs = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Extract authenticated user if attached by auth middleware
    const reqUser = (req as any).user;
    const userId = reqUser?.id || null;
    const userEmail = reqUser?.email || null;
    const userRole = reqUser?.role_name || reqUser?.role || (userId ? 'user' : 'guest');

    // Action name resolution
    const cleanPath = path.split('?')[0];
    const actionName = `${req.method.toUpperCase()} ${cleanPath}`;

    // Cyber security threat evaluation
    const threat = analyzeCyberThreats(req, statusCode);

    // Asynchronously log audit entry without blocking response pipeline
    createAuditLog({
      user_id: userId,
      user_email: userEmail,
      user_role: userRole,
      action: actionName,
      resource: cleanPath,
      method: req.method,
      endpoint: path,
      status_code: statusCode,
      response_time_ms: responseTimeMs,
      ip_address: clientIp,
      user_agent: (req.headers['user-agent'] as string) || null,
      latitude: geo.latitude,
      longitude: geo.longitude,
      city: geo.city,
      country: geo.country,
      country_code: geo.country_code,
      query_params: Object.keys(req.query || {}).length > 0 ? req.query : null,
      request_body: req.body && req.method !== 'GET' ? req.body : null,
      risk_level: threat.risk_level,
      anomaly_flags: threat.anomaly_flags,
    }).catch(err => console.error('Audit Middleware Logger Error:', err));
  });

  next();
}
