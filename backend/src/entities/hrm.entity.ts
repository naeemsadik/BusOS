import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Organization } from './organization.entity';
import { User } from './user.entity';

export enum EmploymentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  PAID_LEAVE = 'paid_leave',
  UNPAID_LEAVE = 'unpaid_leave',
  HOLIDAY = 'holiday',
}

export enum AttendanceSource {
  SELF = 'self',
  MANUAL = 'manual',
}

export enum PayType {
  MONTHLY = 'monthly',
  DAILY = 'daily',
}

export enum PayrollStatus {
  DRAFT = 'draft',
  FINALIZED = 'finalized',
  PAID = 'paid',
}

export enum PayrollAdjustmentType {
  EARNING = 'earning',
  DEDUCTION = 'deduction',
}

export interface PayrollAdjustment {
  label: string;
  type: PayrollAdjustmentType;
  amount: number;
}

@Entity('hrm_settings')
@Index(['organizationId'], { unique: true })
export class HrmSettings {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @OneToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ default: 'Asia/Dhaka' }) timezone: string;
  @Column({ length: 3, default: 'BDT' }) currencyCode: string;
  @Column({ type: 'jsonb', default: () => "'[0,1,2,3,4,6]'::jsonb" }) workDays: number[];
  @Column({ type: 'time', default: '09:00:00' }) workStartTime: string;
  @Column({ type: 'time', default: '17:00:00' }) workEndTime: string;
  @Column({ type: 'int', default: 10 }) graceMinutes: number;
  @Column({ default: false }) isConfigured: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_departments')
@Index(['organizationId', 'name'], { unique: true })
export class Department {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ length: 100 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ default: true }) isActive: boolean;
  @OneToMany(() => Designation, (designation) => designation.department)
  designations: Designation[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_designations')
@Index(['organizationId', 'name'], { unique: true })
export class Designation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'uuid', nullable: true }) departmentId: string | null;
  @ManyToOne(() => Department, (department) => department.designations, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' }) department: Department | null;
  @Column({ length: 100 }) name: string;
  @Column({ type: 'text', nullable: true }) description: string | null;
  @Column({ default: true }) isActive: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_employees')
@Index(['organizationId', 'employeeCode'], { unique: true })
@Index(['linkedUserId'], { unique: true, where: '"linkedUserId" IS NOT NULL' })
@Index(['organizationId', 'status'])
export class Employee {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'uuid', nullable: true }) linkedUserId: string | null;
  @OneToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'linkedUserId' }) linkedUser: User | null;
  @Column({ length: 32 }) employeeCode: string;
  @Column({ length: 100 }) firstName: string;
  @Column({ length: 100 }) lastName: string;
  @Column({ type: 'varchar', nullable: true }) email: string | null;
  @Column({ type: 'varchar', nullable: true }) phone: string | null;
  @Column({ type: 'date', nullable: true }) dateOfBirth: string | null;
  @Column({ type: 'text', nullable: true }) address: string | null;
  @Column({ type: 'varchar', nullable: true }) emergencyContactName: string | null;
  @Column({ type: 'varchar', nullable: true }) emergencyContactPhone: string | null;
  @Column({ type: 'date' }) joiningDate: string;
  @Column({ type: 'date', nullable: true }) terminationDate: string | null;
  @Column({ type: 'text', nullable: true }) terminationReason: string | null;
  @Column({ type: 'enum', enum: EmploymentStatus, default: EmploymentStatus.ACTIVE })
  status: EmploymentStatus;
  @Column({ type: 'uuid', nullable: true }) departmentId: string | null;
  @ManyToOne(() => Department, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departmentId' }) department: Department | null;
  @Column({ type: 'uuid', nullable: true }) designationId: string | null;
  @ManyToOne(() => Designation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'designationId' }) designation: Designation | null;
  @Column({ type: 'jsonb', nullable: true }) workDaysOverride: number[] | null;
  @Column({ type: 'time', nullable: true }) workStartTimeOverride: string | null;
  @Column({ type: 'time', nullable: true }) workEndTimeOverride: string | null;
  @Column({ type: 'int', nullable: true }) graceMinutesOverride: number | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @OneToMany(() => Attendance, (attendance) => attendance.employee) attendance: Attendance[];
  @OneToMany(() => EmployeeCompensation, (compensation) => compensation.employee)
  compensations: EmployeeCompensation[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_attendance')
@Index(['organizationId', 'employeeId', 'workDate'], { unique: true })
@Index(['organizationId', 'workDate'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'uuid' }) employeeId: string;
  @ManyToOne(() => Employee, (employee) => employee.attendance, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' }) employee: Employee;
  @Column({ type: 'date' }) workDate: string;
  @Column({ type: 'enum', enum: AttendanceStatus }) status: AttendanceStatus;
  @Column({ type: 'enum', enum: AttendanceSource, default: AttendanceSource.MANUAL })
  source: AttendanceSource;
  @Column({ type: 'timestamptz', nullable: true }) checkInAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) checkOutAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) scheduledStartAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) scheduledEndAt: Date | null;
  @Column({ type: 'int', default: 0 }) workedMinutes: number;
  @Column({ type: 'int', default: 0 }) lateMinutes: number;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid', nullable: true }) createdById: string | null;
  @Column({ type: 'uuid', nullable: true }) updatedById: string | null;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_holidays')
@Index(['organizationId', 'holidayDate'], { unique: true })
export class Holiday {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'date' }) holidayDate: string;
  @Column({ length: 150 }) name: string;
  @Column({ default: true }) isPaid: boolean;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_employee_compensations')
@Index(['organizationId', 'employeeId', 'effectiveFrom'], { unique: true })
export class EmployeeCompensation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @Column({ type: 'uuid' }) employeeId: string;
  @ManyToOne(() => Employee, (employee) => employee.compensations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'employeeId' }) employee: Employee;
  @Column({ type: 'enum', enum: PayType }) payType: PayType;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) baseRate: number;
  @Column({ length: 3 }) currencyCode: string;
  @Column({ type: 'date' }) effectiveFrom: string;
  @Column({ type: 'date', nullable: true }) effectiveTo: string | null;
  @Column({ type: 'text', nullable: true }) notes: string | null;
  @Column({ type: 'uuid' }) createdById: string;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_payroll_runs')
@Index(['organizationId', 'year', 'month'], { unique: true })
export class PayrollRun {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'int' }) year: number;
  @Column({ type: 'int' }) month: number;
  @Column({ type: 'date' }) periodStart: string;
  @Column({ type: 'date' }) periodEnd: string;
  @Column({ length: 3 }) currencyCode: string;
  @Column({ type: 'enum', enum: PayrollStatus, default: PayrollStatus.DRAFT })
  status: PayrollStatus;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) totalNetPay: number;
  @Column({ type: 'uuid' }) generatedById: string;
  @Column({ type: 'timestamptz', nullable: true }) finalizedAt: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) paidAt: Date | null;
  @Column({ type: 'varchar', nullable: true }) paymentReference: string | null;
  @Column({ type: 'text', nullable: true }) paymentNote: string | null;
  @OneToMany(() => PayrollItem, (item) => item.run) items: PayrollItem[];
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_payroll_items')
@Index(['runId', 'employeeId'], { unique: true })
export class PayrollItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) runId: string;
  @ManyToOne(() => PayrollRun, (run) => run.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'runId' }) run: PayrollRun;
  @Column({ type: 'uuid' }) employeeId: string;
  @ManyToOne(() => Employee, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employeeId' }) employee: Employee;
  @Column({ type: 'uuid' }) compensationId: string;
  @Column() employeeCode: string;
  @Column() employeeName: string;
  @Column({ type: 'enum', enum: PayType }) payType: PayType;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) baseRate: number;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) baseEarnings: number;
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" }) adjustments: PayrollAdjustment[];
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) additionsTotal: number;
  @Column({ type: 'numeric', precision: 14, scale: 2, default: 0 }) deductionsTotal: number;
  @Column({ type: 'numeric', precision: 14, scale: 2 }) netPay: number;
  @Column({ type: 'int', default: 0 }) scheduledDays: number;
  @Column({ type: 'int', default: 0 }) presentDays: number;
  @Column({ type: 'int', default: 0 }) absentDays: number;
  @Column({ type: 'int', default: 0 }) paidLeaveDays: number;
  @Column({ type: 'int', default: 0 }) unpaidLeaveDays: number;
  @Column({ type: 'int', default: 0 }) paidHolidayDays: number;
  @Column({ type: 'int', default: 0 }) unresolvedDays: number;
  @Column({ type: 'int', default: 0 }) workedMinutes: number;
  @Column({ type: 'int', default: 0 }) lateMinutes: number;
  @CreateDateColumn() createdAt: Date;
  @UpdateDateColumn() updatedAt: Date;
}

@Entity('hrm_audit_logs')
@Index(['organizationId', 'createdAt'])
export class HrmAuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid' }) organizationId: string;
  @ManyToOne(() => Organization, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organizationId' }) organization: Organization;
  @Column({ type: 'uuid' }) actorUserId: string;
  @Column({ length: 80 }) action: string;
  @Column({ length: 80 }) entityType: string;
  @Column({ type: 'uuid', nullable: true }) entityId: string | null;
  @Column({ type: 'jsonb', nullable: true }) before: Record<string, unknown> | null;
  @Column({ type: 'jsonb', nullable: true }) after: Record<string, unknown> | null;
  @CreateDateColumn() createdAt: Date;
}
