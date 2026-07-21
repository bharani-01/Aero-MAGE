import { Request } from 'express';

export interface GeoLocation {
  ip: string;
  latitude: number;
  longitude: number;
  city: string;
  country: string;
  country_code: string;
  is_local: boolean;
  provider?: string;
}

// In-memory cache to prevent spamming geolocation APIs for identical IPs
const geoCache = new Map<string, GeoLocation>();

/**
 * Extract clean IPv4 or IPv6 client address from request headers or socket
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',');
    const ip = ips[0].trim();
    if (ip) return ip;
  }

  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp && typeof cfIp === 'string') return cfIp.trim();

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') return realIp.trim();

  const remote = req.socket?.remoteAddress || req.ip || '127.0.0.1';
  return remote.replace(/^::ffff:/, '');
}

/**
 * Fetch public IP of server in local dev environment
 */
let cachedPublicIp: string | null = null;
export async function getPublicIpOfServer(): Promise<string | null> {
  if (cachedPublicIp) return cachedPublicIp;
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    const data = (await res.json()) as any;
    if (data && data.ip) {
      cachedPublicIp = data.ip;
      return cachedPublicIp;
    }
  } catch {}
  return null;
}

/**
 * Provider 1: ip-api.com
 */
async function fetchFromIpApiCom(ip: string): Promise<Partial<GeoLocation> | null> {
  try {
    const res = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,lat,lon,query`, {
      signal: AbortSignal.timeout(3000)
    });
    const data = (await res.json()) as any;
    if (data && data.status === 'success' && data.lat !== undefined && data.lon !== undefined) {
      return {
        latitude: Number(data.lat),
        longitude: Number(data.lon),
        city: data.city || 'Chennai',
        country: data.country || 'India',
        country_code: data.countryCode || 'IN',
        provider: 'ip-api.com'
      };
    }
  } catch {}
  return null;
}

/**
 * Provider 2: ipapi.co
 */
async function fetchFromIpApiCo(ip: string): Promise<Partial<GeoLocation> | null> {
  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'AeroMAGE-AuditLogger/1.0' }
    });
    const data = (await res.json()) as any;
    if (data && data.latitude !== undefined && data.longitude !== undefined) {
      return {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        city: data.city || 'Chennai',
        country: data.country_name || 'India',
        country_code: data.country_code || 'IN',
        provider: 'ipapi.co'
      };
    }
  } catch {}
  return null;
}

/**
 * Provider 3: ipwhois.app
 */
async function fetchFromIpWhois(ip: string): Promise<Partial<GeoLocation> | null> {
  try {
    const res = await fetch(`https://ipwhois.app/json/${ip}`, {
      signal: AbortSignal.timeout(3000)
    });
    const data = (await res.json()) as any;
    if (data && data.success && data.latitude !== undefined && data.longitude !== undefined) {
      return {
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        city: data.city || 'Chennai',
        country: data.country || 'India',
        country_code: data.country_code || 'IN',
        provider: 'ipwhois.app'
      };
    }
  } catch {}
  return null;
}

/**
 * Multi-Provider Asynchronous Geolocation Resolver
 * Evaluates Provider 1 (ip-api.com) -> Provider 2 (ipapi.co) -> Provider 3 (ipwhois.app)
 * Defaults local development IP to Chennai, India (13.0827, 80.2707)
 */
export async function resolveGeoLocationAsync(ip: string): Promise<GeoLocation> {
  let targetIp = ip.trim();

  // Check cache first
  if (geoCache.has(targetIp)) {
    return geoCache.get(targetIp)!;
  }

  const isLocal =
    targetIp === '127.0.0.1' ||
    targetIp === '::1' ||
    targetIp === 'localhost' ||
    targetIp.startsWith('192.168.') ||
    targetIp.startsWith('10.') ||
    targetIp.startsWith('172.16.');

  // If local, attempt to resolve public WAN IP to show real geographic coordinates on the map
  if (isLocal) {
    const publicIp = await getPublicIpOfServer();
    if (publicIp) {
      targetIp = publicIp;
    }
  }

  // Try Provider 1: ip-api.com
  let geo = await fetchFromIpApiCom(targetIp);

  // Try Provider 2: ipapi.co if Provider 1 failed
  if (!geo) {
    geo = await fetchFromIpApiCo(targetIp);
  }

  // Try Provider 3: ipwhois.app if Provider 2 failed
  if (!geo) {
    geo = await fetchFromIpWhois(targetIp);
  }

  // Default location for local development is Chennai, Tamil Nadu, India
  const result: GeoLocation = {
    ip: ip,
    latitude: geo?.latitude !== undefined ? geo.latitude : 13.0827,
    longitude: geo?.longitude !== undefined ? geo.longitude : 80.2707,
    city: geo?.city || (isLocal ? 'Chennai (Local Dev)' : 'Chennai'),
    country: geo?.country || 'India',
    country_code: geo?.country_code || 'IN',
    is_local: isLocal,
    provider: geo?.provider || 'Chennai Local Engine'
  };

  geoCache.set(ip, result);
  return result;
}

/**
 * Synchronous version for fallback defaulting to Chennai, India
 */
export function resolveGeoLocation(ip: string): GeoLocation {
  if (geoCache.has(ip)) return geoCache.get(ip)!;

  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.');
  return {
    ip,
    latitude: 13.0827,
    longitude: 80.2707,
    city: isLocal ? 'Chennai (Local Dev Node)' : 'Chennai',
    country: 'India',
    country_code: 'IN',
    is_local: isLocal,
    provider: 'Chennai Engine'
  };
}
