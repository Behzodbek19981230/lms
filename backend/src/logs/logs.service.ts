import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Log, LogLevel } from './entities/log.entity';

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
    console.log(message, context);
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
  ) {
    try {
      const log = this.logRepository.create({
        level,
        message,
        context,
        userId,
        userAgent,
        ip,
      });
      await this.logRepository.save(log);
    } catch (error) {
      // If logging to DB fails, don't throw error to avoid infinite loop
      console.error('Failed to save log to database:', error);
    }
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
}
