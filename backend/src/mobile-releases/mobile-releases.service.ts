import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MobileRelease,
  MobileReleasePlatform,
} from './entities/mobile-release.entity';
import { CreateMobileReleaseDto } from './dto/create-mobile-release.dto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { spawn } from 'child_process';
import { path7za } from '7zip-bin';
import type { Express } from 'express';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationPriority,
  NotificationType,
} from '../notifications/entities/notification.entity';
import { User } from '../users/entities/user.entity';

const ARCHIVE_PASSWORD = 'lms1234';

@Injectable()
export class MobileReleasesService {
  private readonly logger = new Logger(MobileReleasesService.name);

  constructor(
    @InjectRepository(MobileRelease)
    private readonly mobileReleaseRepo: Repository<MobileRelease>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private getPublicUploadsDir(): string {
    // dist/src -> dist ; dist/.. -> project root? In runtime, __dirname is dist/src/mobile-releases
    // We rely on relative to compiled dist structure: dist/src/.. -> dist
    // public folder sits at projectRoot/public
    return path.join(process.cwd(), 'public', 'uploads', 'mobile-releases');
  }

  private async ensureDir(dirPath: string) {
    await fs.mkdir(dirPath, { recursive: true });
  }

  private validateFileForPlatform(
    platform: MobileReleasePlatform,
    file: Express.Multer.File,
  ) {
    const original = (file?.originalname || '').toLowerCase();
    if (!original) throw new BadRequestException('Fayl nomi topilmadi');

    if (platform === MobileReleasePlatform.ANDROID) {
      if (!original.endsWith('.apk')) {
        throw new BadRequestException(
          'Android uchun faqat .apk fayl qabul qilinadi',
        );
      }
    }

    if (platform === MobileReleasePlatform.IOS) {
      // iOS build ko‘pincha .ipa yoki .zip ko‘rinishida bo‘ladi
      if (!original.endsWith('.ipa') && !original.endsWith('.zip')) {
        throw new BadRequestException(
          'iOS uchun .ipa yoki .zip fayl qabul qilinadi',
        );
      }
    }
  }

  private run7zCreateEncryptedArchive(
    sourceFilePath: string,
    archiveFilePath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        'a',
        // We use 7za but produce a ZIP archive (AES256) for easier client handling.
        '-tzip',
        '-y',
        `-p${ARCHIVE_PASSWORD}`,
        '-mem=AES256',
        archiveFilePath,
        sourceFilePath,
      ];

      // In some environments (or after certain installs) the binary may lose its exec bit.
      // Best-effort: ensure it is executable before spawning.
      void fs
        .chmod(path7za, 0o755)
        .catch(() => undefined)
        .finally(() => {
          const child = spawn(path7za, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
          });

          let stderr = '';
          child.stderr?.on('data', (d) => {
            stderr += String(d);
          });

          child.on('error', (err) => {
            if (stderr) {
              (err as any).stderr = stderr;
            }
            reject(err);
          });

          child.on('close', (code) => {
            if (code === 0) return resolve();
            const extra = stderr ? `; stderr=${stderr.slice(0, 500)}` : '';
            return reject(
              new Error(`7z exit code ${code ?? 'unknown'}${extra}`),
            );
          });
        });
    });
  }

  private safeFilePart(value: string): string {
    return String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-');
  }

  async createRelease(
    dto: CreateMobileReleaseDto,
    file: Express.Multer.File,
    user?: { id?: number; role?: string },
  ) {
    if (!file?.path) {
      throw new BadRequestException('Fayl topilmadi');
    }

    this.validateFileForPlatform(dto.platform, file);

    const existing = await this.mobileReleaseRepo.findOne({
      where: { platform: dto.platform, version: dto.version },
    });
    if (existing) {
      throw new ConflictException(
        'Bu platforma uchun bu version allaqachon mavjud',
      );
    }

    const publicDir = this.getPublicUploadsDir();
    await this.ensureDir(publicDir);

    const ts = Date.now();
    const baseName = `${this.safeFilePart(dto.platform)}-v${this.safeFilePart(dto.version)}-${ts}`;
    const archiveFileName = `${baseName}.zip`;
    const archiveFullPath = path.join(publicDir, archiveFileName);

    try {
      await this.run7zCreateEncryptedArchive(file.path, archiveFullPath);
    } catch (e) {
      this.logger.error(`Archive failed: ${e?.message || e}`);
      throw new InternalServerErrorException(
        'Arxivlashda xatolik. Serverda 7zip ishlamadi yoki fayl buzilgan bo‘lishi mumkin.',
      );
    } finally {
      // Temp file cleanup
      try {
        await fs.unlink(file.path);
      } catch {}
    }

    let statSize = 0;
    try {
      const st = await fs.stat(archiveFullPath);
      statSize = Number(st.size || 0);
    } catch {}

    const release = this.mobileReleaseRepo.create({
      platform: dto.platform,
      version: dto.version,
      originalFileName: file.originalname,
      archiveFileName,
      archiveRelativePath: `mobile-releases/${archiveFileName}`,
      archiveSizeBytes: statSize,
      uploadedByRole: user?.role,
      uploadedByUserId: typeof user?.id === 'number' ? user.id : undefined,
    });

    try {
      const saved = await this.mobileReleaseRepo.save(release);
      const publicDto = this.toPublicDto(saved);

      // Notify all users about the new version (download will mark as read)
      try {
        const users = await this.userRepo.find({ select: ['id'] });
        const userIds = users
          .map((u) => u.id)
          .filter((id): id is number => typeof id === 'number');

        await this.notificationsService.createForUsers(
          userIds,
          'Yangi mobil ilova versiyasi',
          `${String(dto.platform).toUpperCase()} v${dto.version} yuklab olish mumkin`,
          NotificationType.SYSTEM,
          NotificationPriority.HIGH,
          {
            kind: 'mobile_release',
            platform: dto.platform,
            version: dto.version,
            archiveUrl: publicDto.archiveUrl,
            releaseId: publicDto.id,
          },
        );
      } catch (e) {
        this.logger.warn('Failed to create mobile release notifications');
      }

      return publicDto;
    } catch (e) {
      // If DB save fails, also cleanup archive file
      try {
        await fs.unlink(archiveFullPath);
      } catch {}
      throw new InternalServerErrorException('Release saqlashda xatolik');
    }
  }

  toPublicDto(release: MobileRelease) {
    return {
      id: release.id,
      platform: release.platform,
      version: release.version,
      originalFileName: release.originalFileName,
      archiveUrl: `/uploads/${release.archiveRelativePath}`,
      archiveSizeBytes: release.archiveSizeBytes,
      createdAt: release.createdAt,
    };
  }

  async listAll() {
    const items = await this.mobileReleaseRepo.find({
      order: { createdAt: 'DESC' },
    });
    return items.map((r) => this.toPublicDto(r));
  }

  async getLatest(platform?: MobileReleasePlatform) {
    const qb = this.mobileReleaseRepo
      .createQueryBuilder('r')
      .orderBy('r.createdAt', 'DESC')
      .limit(1);

    if (platform) {
      qb.where('r.platform = :platform', { platform });
    }

    const item = await qb.getOne();
    if (!item) return null;
    return this.toPublicDto(item);
  }
}
