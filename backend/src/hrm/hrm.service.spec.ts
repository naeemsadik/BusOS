import { BadRequestException } from '@nestjs/common';
import { getMetadataArgsStorage } from 'typeorm';
import { Attendance, Employee, HrmSettings, PayrollRun } from '../entities';
import { HrmService } from './hrm.service';

describe('HrmService business rules', () => {
  let service: HrmService;

  beforeEach(() => {
    service = new HrmService(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );
  });

  it('converts organization-local schedule times to UTC', () => {
    const value = (service as any).zonedDateTimeToUtc('2026-09-23', '09:00', 'Asia/Dhaka');

    expect(value.toISOString()).toBe('2026-09-23T03:00:00.000Z');
  });

  it('calculates worked and grace-adjusted late minutes', () => {
    const attendance = {
      checkInAt: new Date('2026-09-23T03:20:00.000Z'),
      checkOutAt: new Date('2026-09-23T11:20:00.000Z'),
      scheduledStartAt: new Date('2026-09-23T03:00:00.000Z'),
    } as Attendance;

    (service as any).calculateAttendanceMinutes(attendance, 10);

    expect(attendance.workedMinutes).toBe(480);
    expect(attendance.lateMinutes).toBe(10);
  });

  it('rounds payroll values through integer minor units', () => {
    const minor = (service as any).toMinor(1250.005);

    expect(minor).toBe(125001);
    expect((service as any).fromMinor(minor)).toBe(1250.01);
  });

  it('rejects reversed attendance date ranges', () => {
    expect(() => (service as any).dateRange('2026-09-24', '2026-09-23')).toThrow(BadRequestException);
  });

  it('protects exported spreadsheets from formula injection', () => {
    const csv = (service as any).toCsv(['Employee'], [['=HYPERLINK("https://invalid.example")']]);

    expect(csv).toContain("'=HYPERLINK");
    expect(csv).not.toContain('\r\n"=HYPERLINK');
  });

  it('initializes organization settings without a concurrent insert failure', async () => {
    const settings = { id: 'settings-id', organizationId: 'organization-id' } as HrmSettings;
    const execute = jest.fn().mockResolvedValue(undefined);
    const settingsRepo = {
      findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(settings),
      createQueryBuilder: jest.fn(() => ({
        insert: () => ({
          values: () => ({
            orIgnore: () => ({ execute }),
          }),
        }),
      })),
    };
    const concurrentService = new HrmService(
      settingsRepo as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(concurrentService.getSettings('organization-id')).resolves.toBe(settings);
    expect(execute).toHaveBeenCalledTimes(1);
    expect(settingsRepo.findOne).toHaveBeenCalledTimes(2);
  });
});

describe('HRM entity metadata', () => {
  it('declares database types for nullable union fields', () => {
    const expected: Array<[Function, string[]]> = [
      [Employee, ['email', 'phone', 'emergencyContactName', 'emergencyContactPhone']],
      [PayrollRun, ['paymentReference']],
    ];

    for (const [entity, properties] of expected) {
      const columns = getMetadataArgsStorage().columns.filter((column) => column.target === entity);
      for (const property of properties) {
        expect(columns.find((column) => column.propertyName === property)?.options.type).toBe('varchar');
      }
    }
  });
});
