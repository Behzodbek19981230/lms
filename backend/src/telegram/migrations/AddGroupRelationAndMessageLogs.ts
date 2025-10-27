import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
  Table,
  TableIndex,
} from 'typeorm';

/**
 * Migration to add:
 * 1. groupId column to telegram_chats table
 * 2. Create telegram_message_logs table for message delivery tracking
 */
export class AddGroupRelationAndMessageLogs1698500000000
  implements MigrationInterface
{
  name = 'AddGroupRelationAndMessageLogs1698500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add groupId column to telegram_chats
    await queryRunner.addColumn(
      'telegram_chats',
      new TableColumn({
        name: 'groupId',
        type: 'int',
        isNullable: true,
      }),
    );

    // 2. Add foreign key for groupId
    await queryRunner.createForeignKey(
      'telegram_chats',
      new TableForeignKey({
        columnNames: ['groupId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'groups',
        onDelete: 'CASCADE',
      }),
    );

    // 3. Add index for groupId
    await queryRunner.createIndex(
      'telegram_chats',
      new TableIndex({
        name: 'IDX_telegram_chats_group',
        columnNames: ['groupId'],
      }),
    );

    // 4. Create telegram_message_logs table
    await queryRunner.createTable(
      new Table({
        name: 'telegram_message_logs',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'chatId',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'messageType',
            type: 'enum',
            enum: [
              'exam_start',
              'attendance',
              'results',
              'payment',
              'announcement',
              'test_distribution',
            ],
          },
          {
            name: 'content',
            type: 'text',
          },
          {
            name: 'status',
            type: 'enum',
            enum: ['pending', 'sent', 'failed', 'retrying'],
            default: "'pending'",
          },
          {
            name: 'priority',
            type: 'enum',
            enum: ['high', 'normal', 'low'],
            default: "'normal'",
          },
          {
            name: 'telegramMessageId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'retryCount',
            type: 'int',
            default: 0,
          },
          {
            name: 'error',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'sentAt',
            type: 'timestamp',
            isNullable: true,
          },
          {
            name: 'nextRetryAt',
            type: 'timestamp',
            isNullable: true,
          },
        ],
      }),
      true,
    );

    // 5. Create indexes for telegram_message_logs
    await queryRunner.createIndex(
      'telegram_message_logs',
      new TableIndex({
        name: 'IDX_msg_logs_chat',
        columnNames: ['chatId'],
      }),
    );

    await queryRunner.createIndex(
      'telegram_message_logs',
      new TableIndex({
        name: 'IDX_msg_logs_status',
        columnNames: ['status'],
      }),
    );

    await queryRunner.createIndex(
      'telegram_message_logs',
      new TableIndex({
        name: 'IDX_msg_logs_type',
        columnNames: ['messageType'],
      }),
    );

    await queryRunner.createIndex(
      'telegram_message_logs',
      new TableIndex({
        name: 'IDX_msg_logs_created',
        columnNames: ['createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'telegram_message_logs',
      new TableIndex({
        name: 'IDX_msg_logs_next_retry',
        columnNames: ['nextRetryAt'],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop telegram_message_logs table and its indexes
    await queryRunner.dropTable('telegram_message_logs', true);

    // Drop groupId foreign key and column from telegram_chats
    const telegramChatsTable = await queryRunner.getTable('telegram_chats');

    if (telegramChatsTable) {
      const groupForeignKey = telegramChatsTable.foreignKeys.find(
        (fk) => fk.columnNames.indexOf('groupId') !== -1,
      );

      if (groupForeignKey) {
        await queryRunner.dropForeignKey('telegram_chats', groupForeignKey);
      }

      await queryRunner.dropIndex('telegram_chats', 'IDX_telegram_chats_group');
      await queryRunner.dropColumn('telegram_chats', 'groupId');
    }
  }
}
