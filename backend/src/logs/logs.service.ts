import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AnalyticsEventType, Log, LogLevel } from './entities/log.entity';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(
    @InjectRepository(Log)
    private logRepository: Repository<Log>,
  ) {}

  async log(
    message: string,
    context?: string,
    userId?: number,
    userAgent?: string,
    ip?: string,
  ) {
    await this.saveLog(LogLevel.LOG, message, context, userId, userAgent, ip);
  }

  async error(
    message: string,
    trace?: string,
    context?: string,
    userId?: number,
    userAgent?: string,
    ip?: string,
  ) {
    console.error(message, trace, context);
    await this.saveLog(
      LogLevel.ERROR,
      `${message}${trace ? `\n${trace}` : ''}`,
      context,
      userId,
      userAgent,
      ip,
    );
  }

  async warn(
    message: string,
    context?: string,
    userId?: number,
    userAgent?: string,
    ip?: string,
  ) {
    console.warn(message, context);
    await this.saveLog(LogLevel.WARN, message, context, userId, userAgent, ip);
  }

  async debug(
    message: string,
    context?: string,
    userId?: number,
    userAgent?: string,
    ip?: string,
  ) {
    console.debug(message, context);
    await this.saveLog(LogLevel.DEBUG, message, context, userId, userAgent, ip);
  }

  async verbose(
    message: string,
    context?: string,
    userId?: number,
    userAgent?: string,
    ip?: string,
  ) {
    await this.saveLog(
      LogLevel.VERBOSE,
      message,
      context,
      userId,
      userAgent,
      ip,
    );
  }

  private async saveLog(
    level: LogLevel,
    message: string,
    context?: string,
    userId?: number,
    userAgent?: string,
    ip?: string,
    extras?: Partial<Pick<Log, 'eventType' | 'path' | 'method' | 'referrer' | 'deviceType' | 'browser' | 'os'>>,
  ) {
    try {
      const ua = this.parseUserAgent(userAgent);
      const log = this.logRepository.create({
        level,
        message,
        context,
        userId,
        userAgent,
        ip,
        ...(extras || {}),
        deviceType: extras?.deviceType ?? ua.deviceType,
        browser: extras?.browser ?? ua.browser,
        os: extras?.os ?? ua.os,
      });
      await this.logRepository.save(log);
    } catch (error) {
      // If logging to DB fails, don't throw error to avoid infinite loop
      console.error('Failed to save log to database:', error);
    }
  }

  /**
   * Structured analytics event tracking stored in logs table.
   */
  async trackEvent(params: {
    eventType: AnalyticsEventType;
    path?: string;
    method?: string;
    referrer?: string;
    userId?: number;
    userAgent?: string;
    ip?: string;
    message?: string;
  }) {
    await this.saveLog(
      LogLevel.LOG,
      params.message || `analytics:${params.eventType}`,
      'Analytics',
      params.userId,
      params.userAgent,
      params.ip,
      {
        eventType: params.eventType,
        path: params.path,
        method: params.method,
        referrer: params.referrer,
      },
    );
  }

  private parseUserAgent(userAgent?: string): {
    deviceType?: string;
    browser?: string;
    os?: string;
  } {
    if (!userAgent) return {};
    const ua = userAgent.toLowerCase();

    const isBot = ua.includes('bot') || ua.includes('spider') || ua.includes('crawler');
    const isMobile = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone');
    const isTablet = ua.includes('ipad') || ua.includes('tablet');

    const deviceType = isBot ? 'bot' : isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';

    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac os') || ua.includes('macintosh')) os = 'macos';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ios')) os = 'ios';
    else if (ua.includes('linux')) os = 'linux';

    let browser = 'unknown';
    if (ua.includes('edg/')) browser = 'edge';
    else if (ua.includes('chrome/') && !ua.includes('chromium') && !ua.includes('edg/')) browser = 'chrome';
    else if (ua.includes('firefox/')) browser = 'firefox';
    else if (ua.includes('safari/') && !ua.includes('chrome/')) browser = 'safari';

    return { deviceType, browser, os };
  }

  async findAll(
    limit: number = 100,
    offset: number = 0,
    level?: LogLevel,
    search?: string,
    startDate?: string,
    endDate?: string,
    context?: string,
  ): Promise<Log[]> {
    const query = this.logRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC')
      .limit(limit)
      .offset(offset);

    const conditions: string[] = [];
    const parameters: any = {};

    if (level) {
      conditions.push('log.level = :level');
      parameters.level = level;
    }

    if (search) {
      conditions.push(
        '(log.message ILIKE :search OR log.context ILIKE :search)',
      );
      parameters.search = `%${search}%`;
    }

    if (startDate) {
      conditions.push('log.createdAt >= :startDate');
      parameters.startDate = new Date(startDate);
    }

    if (endDate) {
      conditions.push('log.createdAt <= :endDate');
      parameters.endDate = new Date(endDate);
    }

    if (context) {
      conditions.push('log.context = :context');
      parameters.context = context;
    }

    if (conditions.length > 0) {
      query.where(conditions.join(' AND '), parameters);
    }

    return await query.getMany();
  }

  async getLogStats() {
    const stats = await this.logRepository
      .createQueryBuilder('log')
      .select('log.level', 'level')
      .addSelect('COUNT(*)', 'count')
      .groupBy('log.level')
      .getRawMany();

    return stats.reduce((acc, stat) => {
      acc[stat.level] = parseInt(stat.count);
      return acc;
    }, {});
  }

  async getAnalyticsSummary(days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days + 1);

    // Daily counts (logins + pageviews)
    const dailyRows = await this.logRepository
      .createQueryBuilder('log')
      .select(`date_trunc('day', log.createdAt)`, 'day')
      .addSelect('log."eventType"', 'eventType')
      .addSelect('COUNT(*)', 'count')
      .where('log."eventType" IS NOT NULL')
      .andWhere('log.createdAt >= :since', { since })
      .groupBy(`day`)
      .addGroupBy('log."eventType"')
      .orderBy('day', 'ASC')
      .getRawMany();

    const dayMap = new Map<string, { date: string; logins: number; pageviews: number }>();
    for (const r of dailyRows) {
      const d = new Date(r.day).toISOString().slice(0, 10);
      const current = dayMap.get(d) || { date: d, logins: 0, pageviews: 0 };
      const cnt = parseInt(r.count, 10) || 0;
      if (r.eventType === AnalyticsEventType.LOGIN) current.logins += cnt;
      if (r.eventType === AnalyticsEventType.PAGE_VIEW) current.pageviews += cnt;
      dayMap.set(d, current);
    }
    const daily = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Top routes
    const topRoutes = await this.logRepository
      .createQueryBuilder('log')
      .select('log.path', 'path')
      .addSelect('COUNT(*)', 'count')
      .where('log."eventType" = :evt', { evt: AnalyticsEventType.PAGE_VIEW })
      .andWhere('log.createdAt >= :since', { since })
      .andWhere('log.path IS NOT NULL')
      .groupBy('log.path')
      .orderBy('COUNT(*)', 'DESC')
      .limit(15)
      .getRawMany();

    // Device breakdown (based on parsed UA)
    const devices = await this.logRepository
      .createQueryBuilder('log')
      .select('log."deviceType"', 'deviceType')
      .addSelect('COUNT(*)', 'count')
      .where('log."eventType" = :evt', { evt: AnalyticsEventType.PAGE_VIEW })
      .andWhere('log.createdAt >= :since', { since })
      .andWhere('log."deviceType" IS NOT NULL')
      .groupBy('log."deviceType"')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    const browsers = await this.logRepository
      .createQueryBuilder('log')
      .select('log.browser', 'browser')
      .addSelect('COUNT(*)', 'count')
      .where('log."eventType" = :evt', { evt: AnalyticsEventType.PAGE_VIEW })
      .andWhere('log.createdAt >= :since', { since })
      .andWhere('log.browser IS NOT NULL')
      .groupBy('log.browser')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    const os = await this.logRepository
      .createQueryBuilder('log')
      .select('log.os', 'os')
      .addSelect('COUNT(*)', 'count')
      .where('log."eventType" = :evt', { evt: AnalyticsEventType.PAGE_VIEW })
      .andWhere('log.createdAt >= :since', { since })
      .andWhere('log.os IS NOT NULL')
      .groupBy('log.os')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return { since: since.toISOString(), days, daily, topRoutes, devices, browsers, os };
  }

  async getRecentAnalytics(limit: number) {
    return this.logRepository
      .createQueryBuilder('log')
      .where('log."eventType" IS NOT NULL')
      .orderBy('log.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }
}
