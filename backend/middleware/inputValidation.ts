import { Request, Response, NextFunction } from 'express';
import { createAuditLog } from '../services/auditLogger.js';
import { getClientIp } from '../utils/geo.js';

// OWASP SQL Injection detection regex patterns
const SQLI_REGEX = /(\b(UNION(\s+ALL)?\s+SELECT|SELECT\s+.+\s+FROM|INSERT\s+INTO|UPDATE\s+.+\s+SET|DELETE\s+FROM|DROP\s+(TABLE|DATABASE)|ALTER\s+TABLE|EXEC(UTE)?\s*\(|INFORMATION_SCHEMA|BENCHMARK\s*\(|PG_SLEEP\s*\(|SLEEP\s*\()\b|'--|;\s*SELECT|' OR '1'='1|' OR 1=1|" OR 1=1|\/\*.*\*\/)/i;

// OWASP XSS attack detection regex patterns
const XSS_REGEX = /(<script\b[^>]*>|javascript\s*:|onload\s*=|onerror\s*=|eval\s*\(|document\.cookie|<iframe\b)/i;

/**
 * Global Input Validation & Cyber Threat Interceptor Middleware
 * Validates every user input parameter (req.body, req.query, req.params) for SQL Injection and XSS attacks.
 */
export function inputValidationMiddleware(req: Request, res: Response, next: NextFunction): void {
  const checkPayload = `${JSON.stringify(req.body || {})} ${JSON.stringify(req.query || {})} ${JSON.stringify(req.params || {})}`;

  // 1. Detect and Block SQL Injection Attacks
  if (SQLI_REGEX.test(checkPayload)) {
    const clientIp = getClientIp(req);
    const reqUser = (req as any).user;

    // Persist CRITICAL Security Alert to Database Audit Log
    createAuditLog({
      user_id: reqUser?.id || null,
      user_email: reqUser?.email || null,
      user_role: reqUser?.role_name || 'guest',
      action: 'CYBER_ATTACK_BLOCKED_SQLI',
      resource: req.path,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      status_code: 400,
      ip_address: clientIp,
      user_agent: (req.headers['user-agent'] as string) || null,
      request_body: req.body,
      query_params: req.query,
      risk_level: 'CRITICAL',
      anomaly_flags: ['SQLI_PATTERN_DETECTED', 'ATTACK_BLOCKED_BY_INPUT_VALIDATOR']
    }).catch(() => {});

    res.status(400).json({
      success: false,
      error: {
        code: 'SQL_INJECTION_DETECTED',
        message: 'Security Violation: Malicious SQL injection payload pattern detected in request input.'
      }
    });
    return;
  }

  // 2. Detect and Block Dangerous XSS Script Injection Attacks
  if (XSS_REGEX.test(checkPayload)) {
    const clientIp = getClientIp(req);
    const reqUser = (req as any).user;

    createAuditLog({
      user_id: reqUser?.id || null,
      user_email: reqUser?.email || null,
      user_role: reqUser?.role_name || 'guest',
      action: 'CYBER_ATTACK_BLOCKED_XSS',
      resource: req.path,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      status_code: 400,
      ip_address: clientIp,
      user_agent: (req.headers['user-agent'] as string) || null,
      request_body: req.body,
      query_params: req.query,
      risk_level: 'HIGH',
      anomaly_flags: ['XSS_PAYLOAD_DETECTED', 'ATTACK_BLOCKED_BY_INPUT_VALIDATOR']
    }).catch(() => {});

    res.status(400).json({
      success: false,
      error: {
        code: 'XSS_INJECTION_DETECTED',
        message: 'Security Violation: Malicious script tags or executable HTML detected in request input.'
      }
    });
    return;
  }

  // 3. Sanitize User Input Strings (trim whitespace)
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }

  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
