import dataSource from '../src/database/data-source';
import * as bcrypt from 'bcryptjs';
import {
  Admin,
  Attendance,
  AttendanceSource,
  AttendanceStatus,
  BkashPayment,
  Customer,
  CustomerStatus,
  Delivery,
  DeliveryStatus,
  DeliveryType,
  Department,
  Designation,
  Employee,
  EmployeeCompensation,
  EmploymentStatus,
  Expense,
  ExpenseCategory,
  HrmSettings,
  Order,
  OrderItem,
  OrderSource,
  OrderStatus,
  Organization,
  PayType,
  PaymentMethod,
  PaymentStatus,
  PermissionModuleType,
  Product,
  SmsBalance,
  SmsSettings,
  SslcommerzPayment,
  Supplier,
  SupplierStatus,
  User,
  UserPermission,
  UserRole,
  UserStatus,
} from '../src/entities';

const PASSWORD = 'DemoCMS!2026';
const localHosts = new Set(['localhost', '127.0.0.1']);

function assertSafeTarget() {
  const host = process.env.DATABASE_HOST || '';
  const database = process.env.DATABASE_NAME || '';
  if (!localHosts.has(host) || !database.endsWith('_demo_test') || process.env.BUSOS_ALLOW_TEST_RESET !== 'true') {
    throw new Error('Operational demo seed is restricted to an explicitly authorized local *_demo_test database.');
  }
}

async function main() {
  assertSafeTarget();
  await dataSource.initialize();

  const organizations = dataSource.getRepository(Organization);
  const organization = await organizations.findOne({ where: { name: 'BusOS CMS Demo Shop' } });
  if (!organization) throw new Error('Run cms:seed-demo before seed:demo-operations.');
  const organizationId = organization.id;

  const users = dataSource.getRepository(User);
  const owner = await users.findOneByOrFail({ email: 'cms.demo.owner@busos.local' });
  const password = await bcrypt.hash(PASSWORD, 12);
  const staff = await users.save(users.create({
    email: 'cms.demo.staff@busos.local', firstName: 'Demo', lastName: 'Staff', password,
    role: UserRole.STAFF, status: UserStatus.ACTIVE, isEmailVerified: true,
    organization, organizationId, locale: 'en',
  }));

  const permissions = dataSource.getRepository(UserPermission);
  await permissions.save(Object.values(PermissionModuleType).map((module) => permissions.create({
    user: staff, userId: staff.id, module, canView: true,
    canCreate: module === PermissionModuleType.HRM, canEdit: module === PermissionModuleType.HRM, canDelete: false,
  })));

  const admins = dataSource.getRepository(Admin);
  await admins.save(admins.create({
    username: 'admin', email: 'admin@busos.local', password: await bcrypt.hash('admin123', 12),
    firstName: 'BusOS', lastName: 'Administrator', isActive: true,
  }));

  const customers = dataSource.getRepository(Customer);
  const customer = await customers.save(customers.create({
    name: 'Demo Customer', email: 'customer@busos.local', phone: '01700000000',
    address: 'Dhanmondi, Dhaka', city: 'Dhaka', country: 'Bangladesh',
    status: CustomerStatus.ACTIVE, totalSpent: 500, totalOrders: 2,
    organization, organizationId,
  }));

  const suppliers = dataSource.getRepository(Supplier);
  await suppliers.save(suppliers.create({
    name: 'Demo Supplier', company: 'BusOS Demo Supply', email: 'supplier@busos.local',
    phone: '01800000000', address: 'Dhaka', category: 'General', paymentTerms: 'Net 30',
    status: SupplierStatus.ACTIVE, totalOrders: 4, totalAmount: 25000, totalPurchases: 25000,
    outstandingAmount: 0, organization,
  }));

  const products = dataSource.getRepository(Product);
  const product = await products.findOneOrFail({ where: { organization: { id: organizationId } }, order: { createdAt: 'ASC' } });
  const orders = dataSource.getRepository(Order);
  const order = await orders.save(orders.create({
    orderNumber: 'DEMO-MANUAL-001', source: OrderSource.MANUAL,
    storefrontSite: null, storefrontSiteId: null, storefrontLocale: null,
    checkoutIdempotencyKey: null, confirmationTokenHash: null, confirmationExpiresAt: null,
    stockCommittedAt: null, stockRestoredAt: null, locale: 'en', deliveryMethod: null,
    deliveryAddress: null, customerNote: 'Seeded automated demonstration order',
    idempotencyKey: 'demo-manual-001', publicToken: null, ownerSeenAt: new Date(),
    customerSnapshot: { name: customer.name, phone: customer.phone }, customer, customerId: customer.id,
    customerName: customer.name, customerEmail: customer.email, customerPhone: customer.phone,
    subtotal: Number(product.price) * 2, taxAmount: 0, discountAmount: 0, shippingAmount: 60,
    total: Number(product.price) * 2 + 60, paidAmount: 0, status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.COD, paymentMethod: PaymentMethod.COD,
    shippingAddress: customer.address, shippingCity: customer.city, shippingCountry: customer.country,
    notes: 'Deterministic demo data', organization, organizationId,
  }));
  const orderItems = dataSource.getRepository(OrderItem);
  await orderItems.save(orderItems.create({
    order, orderId: order.id, product, productId: product.id, productName: product.name,
    productSku: product.sku || undefined, unitPrice: Number(product.price), unitCost: Number(product.cost),
    quantity: 2, discountAmount: 0, total: Number(product.price) * 2,
  }));

  const deliveries = dataSource.getRepository(Delivery);
  await deliveries.save(deliveries.create({
    deliveryNumber: 'DEMO-DELIVERY-001', order, orderId: order.id,
    customerName: customer.name, customerPhone: customer.phone || '01700000000',
    deliveryAddress: customer.address || 'Dhaka', deliveryCity: 'Dhaka',
    status: DeliveryStatus.PENDING, deliveryType: DeliveryType.STANDARD,
    estimatedDeliveryDate: new Date(Date.now() + 2 * 86400000), deliveryFee: 60,
    notes: 'Seeded delivery', organization, organizationId,
  }));

  const expenses = dataSource.getRepository(Expense);
  await expenses.save(expenses.create({
    title: 'Demo shop rent', description: 'Seeded monthly operating expense', amount: 12000,
    category: ExpenseCategory.RENT, expenseDate: new Date(), vendor: 'Demo Property',
    paymentMethod: 'cash', reference: 'DEMO-EXP-001', organization, organizationId,
  }));

  const departments = dataSource.getRepository(Department);
  const department = await departments.save(departments.create({
    organizationId, organization, name: 'Operations', description: 'Demo team', isActive: true,
  }));
  const designations = dataSource.getRepository(Designation);
  const designation = await designations.save(designations.create({
    organizationId, organization, departmentId: department.id,
    department, name: 'Sales Associate', description: 'Demo role', isActive: true,
  }));
  const hrmSettings = dataSource.getRepository(HrmSettings);
  await hrmSettings.save(hrmSettings.create({
    organizationId, organization, timezone: 'Asia/Dhaka', currencyCode: 'BDT',
    workDays: [0, 1, 2, 3, 4, 6], workStartTime: '09:00:00', workEndTime: '17:00:00',
    graceMinutes: 10, isConfigured: true,
  }));
  const employees = dataSource.getRepository(Employee);
  const employee = await employees.save(employees.create({
    organizationId, organization, linkedUserId: staff.id, linkedUser: staff,
    employeeCode: 'DEMO-EMP-001', firstName: staff.firstName, lastName: staff.lastName,
    email: staff.email, phone: '01900000000', joiningDate: new Date().toISOString().slice(0, 10),
    status: EmploymentStatus.ACTIVE, departmentId: department.id, department,
    designationId: designation.id, designation, workDaysOverride: null, workStartTimeOverride: null,
    workEndTimeOverride: null, graceMinutesOverride: null, notes: 'Seeded HRM employee',
  }));
  const compensation = dataSource.getRepository(EmployeeCompensation);
  await compensation.save(compensation.create({
    organizationId, employeeId: employee.id, employee, payType: PayType.MONTHLY,
    baseRate: 25000, currencyCode: 'BDT', effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: null, notes: 'Seeded compensation', createdById: owner.id,
  }));
  const attendance = dataSource.getRepository(Attendance);
  const now = new Date();
  await attendance.save(attendance.create({
    organizationId, organization, employeeId: employee.id, employee,
    workDate: now.toISOString().slice(0, 10), status: AttendanceStatus.PRESENT,
    source: AttendanceSource.MANUAL, checkInAt: new Date(now.getTime() - 8 * 3600000),
    checkOutAt: now, scheduledStartAt: null, scheduledEndAt: null, workedMinutes: 480,
    lateMinutes: 0, notes: 'Seeded attendance', createdById: owner.id, updatedById: owner.id,
  }));

  const smsSettings = dataSource.getRepository(SmsSettings);
  await smsSettings.save(smsSettings.create({ isEnabled: true, defaultGateway: 'mock', defaultSenderId: 'BusOS' }));
  const smsBalances = dataSource.getRepository(SmsBalance);
  await smsBalances.save(smsBalances.create({
    organization, organizationId, balance: 500, totalPurchased: 500, totalUsed: 0, totalSpent: 250,
  }));

  await dataSource.getRepository(BkashPayment).save({
    paymentId: 'MOCK-BKASH-001', merchantInvoiceNumber: 'DEMO-SUB-001', trxId: 'MOCK-TRX-001',
    amount: 999, currency: 'BDT', payerReference: owner.email, status: 'COMPLETED',
    bkashUrl: 'http://127.0.0.1/mock/success', callbackUrl: 'http://127.0.0.1/mock/callback',
    paymentCreateTime: now, paymentExecuteTime: now, updateTime: now, organization,
  });
  await dataSource.getRepository(SslcommerzPayment).save({
    tranId: 'MOCK-SSL-001', merchantInvoiceNumber: 'DEMO-SUB-002', amount: 999,
    currency: 'BDT', customerName: owner.firstName, customerEmail: owner.email,
    customerPhone: '01700000001', status: 'VALID', gatewayPageUrl: 'http://127.0.0.1/mock/success',
    paymentProcessor: 'mock', organization, responseData: { provider: 'mock', safe: true },
  });

  process.stdout.write('Operational demo seed ready.\n');
  process.stdout.write(`Owner: cms.demo.owner@busos.local / ${PASSWORD}\n`);
  process.stdout.write(`Staff: cms.demo.staff@busos.local / ${PASSWORD}\n`);
  process.stdout.write('Admin: admin / admin123\n');
  await dataSource.destroy();
}

main().catch(async (error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : error}\n`);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exitCode = 1;
});
