import { Injectable, NestMiddleware } from '@nestjs/common';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const blacklistedPatterns = [
      /cmd=/i, /wget/i, /chmod/i, /rm\s/i, /curl/i, /\/tmp\//i, 
      /armv[67]/i, /scp/i, /nc\s/i, /bash/i, /sh\s/i, /python/i, 
      /perl/i, /\.\./i, /%00/i, /union.*select/i, /sleep\(\d+\)/i, 
      /load_file\(/i, /outfile/i, /into\s+dumpfile/i, /etc\/passwd/i,
      /killall\s/i, /cd\s\/tmp/i, /rm\s[^\s]+/i, /chmod\s777/i, 
      /wget\shttp/i, /curl\shttp/i, /\.\/[^\s]+/i
    ];
    
    const maliciousUserAgents = [
      /zgrab/i, /masscan/i, /curl/i, /wget/i, 
      /python/i, /scanner/i, /^$/i, /KrebsOnSecurity/i
    ];
    
    const clientIp = (req.headers['x-forwarded-for'] || req.ip)?.split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || '';
    
    const isMalicious =
      blacklistedPatterns.some((pattern) => pattern.test(req.url)) || 
      maliciousUserAgents.some((pattern) => pattern.test(userAgent));
    
    if (isMalicious) {
      console.warn(`🚨 Blocked malicious request`);
      console.warn(`   - IP: ${clientIp}`);
      console.warn(`   - Method: ${req.method}`);
      console.warn(`   - URL: ${req.url}`);
      console.warn(`   - User-Agent: ${userAgent || 'N/A'}`);
    
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    next();    
  }
}