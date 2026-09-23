import { BadRequestException } from '@nestjs/common';
import { Attendance } from '../entities';
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
});
