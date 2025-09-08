import {
  Injectable,
  LoggerService as NestLoggerService,
  LogLevel,
} from '@nestjs/common';
import { LogsService } from './logs.service';

@Injectable()
export class CustomLogger implements NestLoggerService {
  constructor(private readonly logsService: LogsService) {}

  log(message: any, context?: string) {
    console.log(`[${context || 'Application'}] ${message}`);
    this.logsService.log(message, context).catch(() => {});
  }

  error(message: any, trace?: string, context?: string) {
    console.error(`[${context || 'Application'}] ${message}`, trace);
    this.logsService.error(message, trace, context).catch(() => {});
  }

  warn(message: any, context?: string) {
    console.warn(`[${context || 'Application'}] ${message}`);
    this.logsService.warn(message, context).catch(() => {});
  }

  debug(message: any, context?: string) {
    console.debug(`[${context || 'Application'}] ${message}`);
    this.logsService.debug(message, context).catch(() => {});
  }

  verbose(message: any, context?: string) {
    console.log(`[VERBOSE] [${context || 'Application'}] ${message}`);
    this.logsService.verbose(message, context).catch(() => {});
  }

  setLogLevels?(levels: LogLevel[]) {
    // Optional: implement if needed
  }
}
