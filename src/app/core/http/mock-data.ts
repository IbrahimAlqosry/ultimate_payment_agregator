import {
  AccountProfile,
  AuditEvent,
  AuthUser,
  DashboardActivity,
  DashboardPayload,
  ErpSystem,
  Institution,
  IntegrationCredentials,
  IntegrationRequest,
  IntegrationUser,
  InboxItem,
  Merchant,
  NotificationWebhook,
  Operator,
  PaymentNotification,
  PaymentPoint,
  Settlement,
} from '@core/models';

export const DEMO_PASSWORD = 'Agg12345!';

export const DEMO_ACCOUNTS: {
  email: string;
  password: string;
  audience: AuthUser['audience'];
  user: AuthUser;
  city: string;
  phone: string;
}[] = [
  {
    email: 'admin@aggregator.ye',
    password: DEMO_PASSWORD,
    audience: 'operator',
    city: 'Sana’a',
    phone: '+967 777 110 001',
    user: {
      id: 'u-admin',
      email: 'admin@aggregator.ye',
      name: 'Anas Al-Hakimi',
      audience: 'operator',
      role: 'admin',
      avatarInitials: 'AH',
      jobTitleKey: 'title.admin',
    },
  },
  {
    email: 'maker@aggregator.ye',
    password: DEMO_PASSWORD,
    audience: 'operator',
    city: 'Taiz',
    phone: '+967 777 110 002',
    user: {
      id: 'u-maker',
      email: 'maker@aggregator.ye',
      name: 'Lina Al-Qershi',
      audience: 'operator',
      role: 'maker',
      avatarInitials: 'LQ',
      jobTitleKey: 'title.maker',
    },
  },
  {
    email: 'checker@aggregator.ye',
    password: DEMO_PASSWORD,
    audience: 'operator',
    city: 'Aden',
    phone: '+967 777 110 003',
    user: {
      id: 'u-checker',
      email: 'checker@aggregator.ye',
      name: 'Karim Haddad',
      audience: 'operator',
      role: 'checker',
      avatarInitials: 'KH',
      jobTitleKey: 'title.checker',
    },
  },
  {
    email: 'reader@aggregator.ye',
    password: DEMO_PASSWORD,
    audience: 'operator',
    city: 'Sana’a',
    phone: '+967 777 110 004',
    user: {
      id: 'u-reader',
      email: 'reader@aggregator.ye',
      name: 'Noor Al-Masri',
      audience: 'operator',
      role: 'reader',
      avatarInitials: 'NM',
      jobTitleKey: 'title.reader',
    },
  },
  {
    email: 'finance@alamal.ye',
    password: DEMO_PASSWORD,
    audience: 'merchant',
    city: 'Sana’a',
    phone: '+967 733 441 220',
    user: {
      id: 'u-merchant',
      email: 'finance@alamal.ye',
      name: 'Nour Al-Amal',
      audience: 'merchant',
      role: 'merchant',
      avatarInitials: 'NA',
      jobTitleKey: 'title.financeLead',
      orgName: 'Al-Amal Pharmacies',
      orgId: 'm-1',
    },
  },
  {
    email: 'ops@tadhamon.ye',
    password: DEMO_PASSWORD,
    audience: 'institution',
    city: 'Sana’a',
    phone: '+967 1 449 180',
    user: {
      id: 'u-fi',
      email: 'ops@tadhamon.ye',
      name: 'Samir Al-Tadhamon',
      audience: 'institution',
      role: 'institution',
      avatarInitials: 'ST',
      jobTitleKey: 'title.opsOfficer',
      orgName: 'Tadhamon Bank',
      orgId: 'fi-1',
    },
  },
];

export const OPERATORS: Operator[] = [
  { id: 'tm-1', name: 'Anas Al-Hakimi', email: 'admin@aggregator.ye', role: 'admin', city: 'Sana’a', status: 'active', lastActive: '2026-08-31T16:40:00.000Z' },
  { id: 'tm-2', name: 'Lina Al-Qershi', email: 'maker@aggregator.ye', role: 'maker', city: 'Taiz', status: 'active', lastActive: '2026-08-31T15:12:00.000Z' },
  { id: 'tm-3', name: 'Karim Haddad', email: 'checker@aggregator.ye', role: 'checker', city: 'Aden', status: 'active', lastActive: '2026-08-31T11:05:00.000Z' },
  { id: 'tm-4', name: 'Noor Al-Masri', email: 'reader@aggregator.ye', role: 'reader', city: 'Sana’a', status: 'active', lastActive: '2026-08-30T18:22:00.000Z' },
  { id: 'tm-5', name: 'Omar Saleh', email: 'omar.saleh@aggregator.ye', role: 'maker', city: 'Hodeidah', status: 'invited', lastActive: '2026-08-28T09:00:00.000Z' },
  { id: 'tm-6', name: 'Sara Nasser', email: 'sara.nasser@aggregator.ye', role: 'checker', city: 'Mukalla', status: 'active', lastActive: '2026-08-31T08:44:00.000Z' },
];

export const MERCHANTS: Merchant[] = [
  { id: 'm-1', legalName: 'Al-Amal Pharmacies', crNumber: '2019/3341', city: 'Sana’a', erpSystem: 'Al-Diwan ERP', status: 'approved', paymentPointCount: 4, onboardedAt: '2026-01-10T09:00:00.000Z', industry: 'health', contactName: 'Nour Al-Amal', email: 'finance@alamal.ye', phone: '+967 733 441 220', submittedBy: 'Lina Al-Qershi', address: 'Sana’a, Hadda Street, Block 7', approvedBy: 'Karim Haddad (Platform Operator)' },
  { id: 'm-2', legalName: 'Souq Taiz Electronics', crNumber: '2021/1188', city: 'Taiz', erpSystem: 'Tijara Cloud', status: 'approved', paymentPointCount: 2, onboardedAt: '2026-03-18T09:00:00.000Z', industry: 'retail', contactName: 'Hani Taiz', email: 'it@souqtaiz.ye', phone: '+967 777 220 118', submittedBy: 'Lina Al-Qershi', address: 'Taiz, Jamal Street', approvedBy: 'Karim Haddad (Platform Operator)' },
  { id: 'm-3', legalName: 'Aden Fresh Fisheries', crNumber: '2018/0442', city: 'Aden', erpSystem: 'Mizan Suite', status: 'rejected', paymentPointCount: 1, onboardedAt: '2026-07-15T09:00:00.000Z', industry: 'other', contactName: 'Salim Aden', email: 'ops@adenfresh.ye', phone: '+967 777 330 442', submittedBy: 'Omar Saleh', address: 'Aden, Crater District' },
  { id: 'm-4', legalName: 'Hodeidah Fuel Stations', crNumber: '2016/7720', city: 'Hodeidah', erpSystem: 'Ledger Yemen', status: 'approved', paymentPointCount: 4, onboardedAt: '2026-02-04T09:00:00.000Z', industry: 'fuel', contactName: 'Fadi Hodeidah', email: 'fuel@hodeidah.ye', phone: '+967 777 440 720', submittedBy: 'Anas Al-Hakimi', address: 'Hodeidah, Corniche', approvedBy: 'Anas Al-Hakimi (Platform Operator)' },
  { id: 'm-5', legalName: 'Ibb Hypermarket', crNumber: '2022/9014', city: 'Ibb', erpSystem: 'Al-Diwan ERP', status: 'pending', paymentPointCount: 1, onboardedAt: '2026-08-24T11:32:00.000Z', industry: 'retail', contactName: 'Huda Al-Ibb', email: 'it@ibbhyper.ye', phone: '+967 777 550 014', submittedBy: 'Lina Al-Qershi', address: 'Ibb, Al-Jalal Street' },
  { id: 'm-6', legalName: 'Mukalla Clinics Group', crNumber: '2017/2265', city: 'Mukalla', erpSystem: 'Tijara Cloud', status: 'approved', paymentPointCount: 3, onboardedAt: '2026-04-21T09:00:00.000Z', industry: 'health', contactName: 'Dr. Amina Mukalla', email: 'admin@mukalla.ye', phone: '+967 777 660 265', submittedBy: 'Karim Haddad', address: 'Mukalla, Corniche Road', approvedBy: 'Karim Haddad (Platform Operator)' },
  { id: 'm-7', legalName: 'Sana’a University Bookstore', crNumber: '2020/5519', city: 'Sana’a', erpSystem: 'Mizan Suite', status: 'pending', paymentPointCount: 0, onboardedAt: '2026-08-23T10:00:00.000Z', industry: 'other', contactName: 'Yasmin Books', email: 'store@su.ye', phone: '+967 777 770 519', submittedBy: 'Omar Saleh', address: 'Sana’a, University Campus' },
  { id: 'm-8', legalName: 'Al-Saeed Trading House', crNumber: '2015/1003', city: 'Taiz', erpSystem: 'Ledger Yemen', status: 'approved', paymentPointCount: 2, onboardedAt: '2026-05-12T09:00:00.000Z', industry: 'retail', contactName: 'Waleed Al-Saeed', email: 'trade@alsaeed.ye', phone: '+967 777 880 003', submittedBy: 'Lina Al-Qershi', address: 'Taiz, Al-Hawban', approvedBy: 'Karim Haddad (Platform Operator)' },
];

export const INSTITUTIONS: Institution[] = [
  {
    id: 'fi-1',
    name: 'Tadhamon Bank',
    type: 'bank',
    cbyLicense: 'CBY-BNK-014',
    contractRef: 'CTR-2025-014',
    city: 'Sana’a',
    status: 'approved',
    contractExpiry: '2029-10-11T00:00:00.000Z',
    contactName: 'Samir Al-Tadhamon',
    email: 'ops@tadhamon.ye',
    phone: '+967 1 449 180',
    contractStart: '2025-01-15T00:00:00.000Z',
    signedDate: '2025-01-15T00:00:00.000Z',
    feePerRequest: 12,
    agreedFee: '0.15% per transaction',
    autoRenewal: true,
    regulatoryAuthority: 'Central Bank of Yemen',
    swiftCode: 'TADHYESA',
    department: 'Operations',
  },
  { id: 'fi-2', name: 'CAC Bank', type: 'bank', cbyLicense: 'CBY-BNK-022', contractRef: 'CTR-2025-022', city: 'Sana’a', status: 'approved', contractExpiry: '2028-06-01T00:00:00.000Z', contactName: 'Maha CAC', email: 'api@cac.ye', phone: '+967 1 220 022', signedDate: '2025-06-01T00:00:00.000Z', agreedFee: '0.18% per transaction', autoRenewal: true },
  { id: 'fi-3', name: 'Al-Kuraimi Islamic Bank', type: 'bank', cbyLicense: 'CBY-B-201', contractRef: 'CTR-2024-0847', city: 'Sana’a', status: 'approved', contractExpiry: '2029-10-11T00:00:00.000Z', contactName: 'Ibrahim Al-Kuraimi', email: 'i.kuraimi@alkuraimi.ye', phone: '+967 1 500 100', signedDate: '2024-10-11T00:00:00.000Z', agreedFee: '0.15% per transaction', autoRenewal: true },
  { id: 'fi-4', name: 'Yemen Kuwait Bank', type: 'bank', cbyLicense: 'CBY-BNK-008', contractRef: 'CTR-2024-008', city: 'Aden', status: 'pending', contractExpiry: '2027-12-01T00:00:00.000Z', contactName: 'Rania Kuwait', email: 'api@ykb.ye', phone: '+967 2 448 008' },
  { id: 'fi-5', name: 'Jawali Wallet', type: 'wallet', cbyLicense: 'CBY-WLT-003', contractRef: 'CTR-2026-103', city: 'Sana’a', status: 'approved', contractExpiry: '2028-01-15T00:00:00.000Z', contactName: 'Jawali Ops', email: 'ops@jawali.ye', phone: '+967 777 103 003' },
  { id: 'fi-6', name: 'Floosak Wallet', type: 'wallet', cbyLicense: 'CBY-WLT-007', contractRef: 'CTR-2026-107', city: 'Aden', status: 'approved', contractExpiry: '2028-09-20T00:00:00.000Z', contactName: 'Floosak Ops', email: 'ops@floosak.ye', phone: '+967 777 107 007' },
  { id: 'fi-7', name: 'OneCash Wallet', type: 'wallet', cbyLicense: 'CBY-WLT-011', contractRef: 'CTR-2026-111', city: 'Taiz', status: 'pending', contractExpiry: '2027-08-30T00:00:00.000Z', contactName: 'OneCash Ops', email: 'ops@onecash.ye', phone: '+967 777 111 011' },
];

export const PAYMENT_POINTS: PaymentPoint[] = [
  { id: 'pp-1', pointCode: '10293', kind: 'merchant_point', merchantName: 'Al-Amal Pharmacies', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'YER', status: 'approved', submittedAt: '2026-08-28T09:14:00.000Z', merchantCr: '2019/3341', submittedBy: 'Nour Al-Amal', erpSystem: 'Al-Diwan ERP', linkedAccount: 'Tadhamon ****1029', actionedAt: '2026-08-28T16:00:00.000Z', actionedBy: 'Samir Al-Tadhamon', pointName: 'Al-Amal HQ Reception', location: 'Sana’a, Hadda St.' },
  { id: 'pp-2', pointCode: 'WAL-4418', kind: 'wallet', merchantName: 'Souq Taiz Electronics', institutionName: 'Jawali Wallet', institutionType: 'wallet', currency: 'USD', status: 'pending', submittedAt: '2026-08-31T08:41:00.000Z', merchantCr: '2021/1188', submittedBy: 'Hani Taiz', erpSystem: 'Tijara Cloud', linkedAccount: 'Jawali ****4418', pointName: 'Souq Taiz Online', location: 'Online' },
  { id: 'pp-3', pointCode: '77821', kind: 'merchant_point', merchantName: 'Hodeidah Fuel Stations', institutionName: 'CAC Bank', institutionType: 'bank', currency: 'SAR', status: 'approved', submittedAt: '2026-08-31T07:22:00.000Z', merchantCr: '2016/7720', submittedBy: 'Fadi Hodeidah', erpSystem: 'Ledger Yemen', linkedAccount: 'CAC ****7821', actionedAt: '2026-08-31T12:00:00.000Z', actionedBy: 'Maha CAC', pointName: 'Hodeidah Station 1', location: 'Hodeidah, Corniche' },
  { id: 'pp-4', pointCode: 'MP-3301', kind: 'merchant_point', merchantName: 'Mukalla Clinics Group', institutionName: 'Yemen Kuwait Bank', institutionType: 'bank', currency: 'YER', status: 'pending', submittedAt: '2026-08-30T21:05:00.000Z', merchantCr: '2017/2265', submittedBy: 'Dr. Amina Mukalla', erpSystem: 'Tijara Cloud', linkedAccount: 'YKB ****3301', pointName: 'Mukalla Clinic Desk', location: 'Mukalla, Corniche Road' },
  { id: 'pp-5', pointCode: 'WAL-9022', kind: 'wallet', merchantName: 'Al-Saeed Trading House', institutionName: 'Floosak Wallet', institutionType: 'wallet', currency: 'USD', status: 'rejected', submittedAt: '2026-08-30T16:48:00.000Z', merchantCr: '2015/1003', submittedBy: 'Waleed Al-Saeed', erpSystem: 'Ledger Yemen', linkedAccount: 'Floosak ****9022', actionedAt: '2026-08-30T19:00:00.000Z', actionedBy: 'Floosak Ops', pointName: 'Al-Saeed Online Portal', location: 'Online' },
  { id: 'pp-6', pointCode: '55910', kind: 'merchant_point', merchantName: 'Ibb Hypermarket', institutionName: 'Al-Kuraimi Islamic Bank', institutionType: 'bank', currency: 'YER', status: 'pending', submittedAt: '2026-08-30T12:10:00.000Z', merchantCr: '2022/9014', submittedBy: 'Huda Al-Ibb', erpSystem: 'Al-Diwan ERP', linkedAccount: 'Kuraimi ****5910', pointName: 'Ibb Hyper Checkout', location: 'Ibb, Al-Jalal Street' },
  { id: 'pp-7', pointCode: '44102', kind: 'merchant_point', merchantName: 'Aden Fresh Fisheries', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'USD', status: 'pending', submittedAt: '2026-08-30T10:33:00.000Z', merchantCr: '2018/0442', submittedBy: 'Salim Aden', erpSystem: 'Mizan Suite', linkedAccount: 'Tadhamon ****4102', pointName: 'Aden Fresh Counter', location: 'Aden, Crater District' },
  { id: 'pp-8', pointCode: 'WAL-1104', kind: 'wallet', merchantName: 'Al-Amal Pharmacies', institutionName: 'Jawali Wallet', institutionType: 'wallet', currency: 'SAR', status: 'approved', submittedAt: '2026-08-29T19:57:00.000Z', merchantCr: '2019/3341', submittedBy: 'Nour Al-Amal', erpSystem: 'Al-Diwan ERP', linkedAccount: 'Jawali ****1104', actionedAt: '2026-08-30T08:00:00.000Z', actionedBy: 'Jawali Ops', pointName: 'Al-Amal Online Portal', location: 'Online' },
  { id: 'pp-9', pointCode: 'WAL-2104', kind: 'wallet', merchantName: 'Al-Amal Pharmacies', institutionName: 'Floosak Wallet', institutionType: 'wallet', currency: 'YER', status: 'pending', submittedAt: '2026-08-31T11:20:00.000Z', merchantCr: '2019/3341', submittedBy: 'Nour Al-Amal', erpSystem: 'Al-Diwan ERP', linkedAccount: 'Floosak ****2104', pointName: 'Al-Amal Wallet Desk', location: 'Online' },
  { id: 'pp-10', pointCode: '44190', kind: 'merchant_point', merchantName: 'Al-Amal Pharmacies', institutionName: 'CAC Bank', institutionType: 'bank', currency: 'YER', status: 'approved', submittedAt: '2026-08-27T14:02:00.000Z', merchantCr: '2019/3341', submittedBy: 'Nour Al-Amal', erpSystem: 'Al-Diwan ERP', linkedAccount: 'CAC ****4190', actionedAt: '2026-08-27T18:00:00.000Z', actionedBy: 'Maha CAC', pointName: 'Al-Amal Aden Branch', location: 'Aden, Crater District' },
  { id: 'pp-11', pointCode: '66102', kind: 'merchant_point', merchantName: 'Mukalla Clinics Group', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'YER', status: 'approved', submittedAt: '2026-08-26T08:15:00.000Z', merchantCr: '2017/2265', submittedBy: 'Dr. Amina Mukalla', erpSystem: 'Tijara Cloud', linkedAccount: 'Tadhamon ****6102', actionedAt: '2026-08-26T14:00:00.000Z', actionedBy: 'Samir Al-Tadhamon', pointName: 'Mukalla Main Clinic', location: 'Mukalla, Corniche Road' },
  { id: 'pp-12', pointCode: '77001', kind: 'merchant_point', merchantName: 'Ibb Hypermarket', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'YER', status: 'pending', submittedAt: '2026-08-31T09:48:00.000Z', merchantCr: '2022/9014', submittedBy: 'Huda Al-Ibb', erpSystem: 'Al-Diwan ERP', linkedAccount: 'Tadhamon ****7001', pointName: 'Ibb Self-Service Kiosk', location: 'Ibb, Al-Jalal Street' },
  { id: 'pp-13', pointCode: '88012', kind: 'merchant_point', merchantName: 'Al-Saeed Trading House', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'USD', status: 'approved', submittedAt: '2026-08-25T16:40:00.000Z', merchantCr: '2015/1003', submittedBy: 'Waleed Al-Saeed', erpSystem: 'Ledger Yemen', linkedAccount: 'Tadhamon ****8012', actionedAt: '2026-08-26T09:00:00.000Z', actionedBy: 'Samir Al-Tadhamon', pointName: 'Al-Saeed Taiz Desk', location: 'Taiz, Al-Hawban' },
  { id: 'pp-14', pointCode: '99120', kind: 'merchant_point', merchantName: 'Souq Taiz Electronics', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'USD', status: 'pending', submittedAt: '2026-08-31T13:05:00.000Z', merchantCr: '2021/1188', submittedBy: 'Hani Taiz', erpSystem: 'Tijara Cloud', linkedAccount: 'Tadhamon ****9120', pointName: 'Souq Taiz POS', location: 'Taiz, Jamal Street' },
  { id: 'pp-15', pointCode: 'WAL-3308', kind: 'wallet', merchantName: 'Hodeidah Fuel Stations', institutionName: 'Tadhamon Bank', institutionType: 'bank', currency: 'SAR', status: 'pending', submittedAt: '2026-08-30T18:11:00.000Z', merchantCr: '2016/7720', submittedBy: 'Fadi Hodeidah', erpSystem: 'Ledger Yemen', linkedAccount: 'Tadhamon ****3308', pointName: 'Hodeidah Wallet Point', location: 'Online' },
];

export const ERPS: ErpSystem[] = [
  { id: 'erp-1', name: 'Al-Diwan ERP', vendor: 'Al-Diwan Soft', status: 'approved', connectedMerchants: 2, lastSync: '2026-08-31T17:10:00.000Z', contractDate: '2025-10-24T00:00:00.000Z', contractExpiry: '2028-10-24T00:00:00.000Z', contactName: 'Diwan Ops', email: 'partners@aldiwan.ye', integrationType: 'Direct Database Integration', contractNumber: 'CTR-ERP-2024-0012', approvedBy: 'Anas Al-Hakimi', onboardedAt: '2025-11-01T00:00:00.000Z' },
  { id: 'erp-2', name: 'Tijara Cloud', vendor: 'Tijara Labs', status: 'approved', connectedMerchants: 2, lastSync: '2026-08-31T16:02:00.000Z', contractDate: '2025-09-12T00:00:00.000Z', contractExpiry: '2027-09-12T00:00:00.000Z', contactName: 'Tijara Ops', email: 'connect@tijara.ye', integrationType: 'REST API', contractNumber: 'CTR-ERP-2025-0008', approvedBy: 'Karim Haddad', onboardedAt: '2025-09-20T00:00:00.000Z' },
  { id: 'erp-3', name: 'Mizan Suite', vendor: 'Mizan Yemen', status: 'pending', connectedMerchants: 0, lastSync: '2026-08-29T12:00:00.000Z', contractExpiry: '', contactName: 'Yasser Mizan', email: 'connect@mizan.ye', integrationType: 'REST API' },
  { id: 'erp-4', name: 'Ledger Yemen', vendor: 'Ledger YE', status: 'approved', connectedMerchants: 2, lastSync: '2026-08-31T08:44:00.000Z', contractDate: '2025-08-29T00:00:00.000Z', contractExpiry: '2028-08-29T00:00:00.000Z', contactName: 'Ledger Ops', email: 'api@ledger.ye', integrationType: 'SFTP File Drop', contractNumber: 'CTR-ERP-2025-0019', approvedBy: 'Karim Haddad', onboardedAt: '2025-09-01T00:00:00.000Z' },
  { id: 'erp-5', name: 'SanaSoft ERP', vendor: 'SanaSoft', status: 'pending', connectedMerchants: 0, lastSync: '2026-08-28T09:30:00.000Z', contractExpiry: '', contactName: 'Fares SanaSoft', email: 'partners@sanasoft.ye', integrationType: 'REST API' },
];

export const INTEGRATION_REQUESTS: IntegrationRequest[] = [
  { id: 'ir-1', code: 'REQ-2026-081', requester: 'Nour Al-Amal', organization: 'Al-Amal Pharmacies', kind: 'credential', email: 'finance@alamal.ye', status: 'pending', submittedAt: '2026-08-31T10:00:00.000Z' },
  { id: 'ir-2', code: 'REQ-2026-080', requester: 'Huda Al-Ibb', organization: 'Ibb Hypermarket', kind: 'detail', email: 'it@ibbhyper.ye', status: 'pending', submittedAt: '2026-08-31T08:05:00.000Z' },
  { id: 'ir-3', code: 'REQ-2026-079', requester: 'Yasser Mizan', organization: 'Mizan Suite', kind: 'credential', email: 'connect@mizan.ye', status: 'pending', submittedAt: '2026-08-30T15:40:00.000Z' },
  { id: 'ir-4', code: 'REQ-2026-078', requester: 'Rania Kuwait', organization: 'Yemen Kuwait Bank', kind: 'detail', email: 'api@ykb.ye', status: 'pending', submittedAt: '2026-08-29T11:22:00.000Z' },
  { id: 'ir-5', code: 'REQ-2026-077', requester: 'Samir Al-Tadhamon', organization: 'Tadhamon Bank', kind: 'institution', email: 'ops@tadhamon.ye', status: 'approved', submittedAt: '2026-08-18T09:12:00.000Z' },
  { id: 'ir-6', code: 'REQ-2026-076', requester: 'Fares SanaSoft', organization: 'SanaSoft ERP', kind: 'erp', email: 'partners@sanasoft.ye', status: 'rejected', submittedAt: '2026-08-22T14:18:00.000Z' },
];

export const INTEGRATION_USERS: IntegrationUser[] = [
  { id: 'iu-1', username: 'erp-alamal-prod', organization: 'Al-Amal Pharmacies', audience: 'merchant', status: 'active', lastUsed: '2026-08-31T16:51:00.000Z', scopes: 'points.read notifications.write' },
  { id: 'iu-2', username: 'fi-tadhamon-notif', organization: 'Tadhamon Bank', audience: 'institution', status: 'active', lastUsed: '2026-08-31T17:04:00.000Z', scopes: 'points.approve notifications.write' },
  { id: 'iu-3', username: 'erp-ibb-sandbox', organization: 'Ibb Hypermarket', audience: 'merchant', status: 'pending', lastUsed: '2026-08-31T08:05:00.000Z', scopes: 'points.read' },
];

export const MERCHANT_WEBHOOK: NotificationWebhook = {
  status: 'approved',
  endpointUrl: 'https://erp.alamal.ye/api/notifications',
  port: '9443',
  authType: 'bearer',
  accessToken: 'eyJhbGciOiJub25lIn0.alamal-webhook-token',
  clientId: 'alamal-erp-client',
  clientSecret: 'AggOauthSecret1',
};

export const CREDENTIALS: Record<string, IntegrationCredentials> = {
  'Al-Amal Pharmacies': {
    status: 'active',
    username: 'erp-alamal-prod',
    password: 'AggApi91',
    apiUrl: 'https://api.ultimatepay.ye/v1/merchant',
    port: '8443',
  },
  'Tadhamon Bank': {
    status: 'active',
    username: 'fi-tadhamon-notif',
    password: 'AggFiApi7',
    apiUrl: 'https://api.ultimatepay.ye/v1/institution',
    port: '8443',
  },
};

export const NOTIFICATIONS: PaymentNotification[] = [
  { id: 'n-1', occurredAt: '2026-08-31T16:12:00.000Z', pointCode: '10293', merchantName: 'Al-Amal Pharmacies', institutionName: 'Tadhamon Bank', amount: 48500, currency: 'YER', invoice: 'INV-88421', status: 'completed', channel: 'sms', title: 'Payment received - INV-88421' },
  { id: 'n-2', occurredAt: '2026-08-31T15:40:00.000Z', pointCode: 'WAL-1104', merchantName: 'Al-Amal Pharmacies', institutionName: 'Jawali Wallet', amount: 210.5, currency: 'SAR', invoice: 'INV-88418', status: 'completed', channel: 'email', title: 'Settlement completed - INV-88418' },
  { id: 'n-3', occurredAt: '2026-08-31T14:08:00.000Z', pointCode: '44190', merchantName: 'Al-Amal Pharmacies', institutionName: 'CAC Bank', amount: 12600, currency: 'YER', invoice: 'INV-88402', status: 'pending', channel: 'webhook', title: 'Payment pending - INV-88402' },
  { id: 'n-4', occurredAt: '2026-08-31T11:22:00.000Z', pointCode: 'WAL-2104', merchantName: 'Al-Amal Pharmacies', institutionName: 'Floosak Wallet', amount: 8900, currency: 'YER', invoice: 'INV-88391', status: 'failed', channel: 'sms', title: 'Payment failed - INV-88391' },
  { id: 'n-5', occurredAt: '2026-08-31T10:05:00.000Z', pointCode: '77821', merchantName: 'Hodeidah Fuel Stations', institutionName: 'CAC Bank', amount: 3400, currency: 'SAR', invoice: 'INV-44110', status: 'completed', channel: 'email', title: 'Payment received - INV-44110' },
  { id: 'n-6', occurredAt: '2026-08-30T19:44:00.000Z', pointCode: '66102', merchantName: 'Mukalla Clinics Group', institutionName: 'Tadhamon Bank', amount: 72000, currency: 'YER', invoice: 'INV-22018', status: 'completed', channel: 'sms', title: 'Payment received - INV-22018' },
  { id: 'n-7', occurredAt: '2026-08-30T18:02:00.000Z', pointCode: '88012', merchantName: 'Al-Saeed Trading House', institutionName: 'Tadhamon Bank', amount: 950, currency: 'USD', invoice: 'INV-11077', status: 'completed', channel: 'webhook', title: 'Payment received - INV-11077' },
  { id: 'n-8', occurredAt: '2026-08-30T09:16:00.000Z', pointCode: '99120', merchantName: 'Souq Taiz Electronics', institutionName: 'Tadhamon Bank', amount: 420, currency: 'USD', invoice: 'INV-33009', status: 'pending', channel: 'email', title: 'Payment pending - INV-33009' },
];

export const AUDIT_LOG: AuditEvent[] = [
  { id: 'a-0', at: '2026-08-31T16:55:00.000Z', actor: 'Anas Al-Hakimi', role: 'admin', action: 'Successful admin console login', entity: 'Console', detail: 'Successful admin console login', screen: 'Login', result: 'success', eventType: 'login', ipAddress: '192.168.1.14' },
  { id: 'a-1', at: '2026-08-31T16:51:00.000Z', actor: 'Karim Haddad', role: 'checker', action: 'Approved merchant', entity: 'Al-Amal Pharmacies', detail: 'Approved Merchant: Al-Amal Pharmacies', screen: 'Merchant Management', result: 'success', eventType: 'approval', ipAddress: '192.168.1.5' },
  { id: 'a-2', at: '2026-08-31T15:12:00.000Z', actor: 'Lina Al-Qershi', role: 'maker', action: 'Submitted FI contract', entity: 'OneCash Wallet', detail: 'Updated FI contract for OneCash Wallet', screen: 'FI Management', result: 'success', eventType: 'modification', ipAddress: '192.168.1.8' },
  { id: 'a-3', at: '2026-08-31T14:08:00.000Z', actor: 'Samir Al-Tadhamon', role: 'institution', action: 'Approved payment point', entity: '10293', detail: 'Approved payment point 10293', screen: 'Payment Points', result: 'success', eventType: 'approval', ipAddress: '192.168.2.10' },
  { id: 'a-4', at: '2026-08-31T11:20:00.000Z', actor: 'Nour Al-Amal', role: 'merchant', action: 'Requested wallet point', entity: 'WAL-2104', detail: 'Requested wallet point WAL-2104', screen: 'My Payment Points', result: 'success', eventType: 'modification', ipAddress: '192.168.3.22' },
  { id: 'a-5', at: '2026-08-30T18:22:00.000Z', actor: 'Noor Al-Masri', role: 'reader', action: 'Exported audit CSV', entity: 'Reports', detail: 'Exported audit CSV for August 2026', screen: 'Reports', result: 'success', eventType: 'modification', ipAddress: '192.168.1.14' },
  { id: 'a-6', at: '2026-08-30T12:10:00.000Z', actor: 'Anas Al-Hakimi', role: 'admin', action: 'Invited operator', entity: 'Omar Saleh', detail: 'Invited operator Omar Saleh', screen: 'Platform Operators', result: 'success', eventType: 'modification', ipAddress: '192.168.1.14' },
  { id: 'a-7', at: '2026-08-29T19:57:00.000Z', actor: 'Karim Haddad', role: 'checker', action: 'Approved ERP', entity: 'Ledger Yemen', detail: 'Approved ERP System: Ledger Yemen', screen: 'ERP System List', result: 'success', eventType: 'approval', ipAddress: '192.168.1.5' },
  { id: 'a-8', at: '2026-08-31T09:14:00.000Z', actor: 'Anas Al-Hakimi', role: 'admin', action: 'Edited operator permissions', entity: 'Screen Permissions', detail: 'Maker row updated', screen: 'Screen Permissions', result: 'success', eventType: 'modification', ipAddress: '192.168.1.14' },
  { id: 'a-9', at: '2026-08-30T16:48:00.000Z', actor: 'Karim Haddad', role: 'checker', action: 'Rejected merchant', entity: 'Aden Fresh Fisheries', detail: 'Rejected FI Merchant Request: Aden Fresh Fisheries due to missing licensing', screen: 'Merchant Management', result: 'success', eventType: 'rejection', ipAddress: '192.168.1.5' },
];

export const INBOX: InboxItem[] = [
  {
    id: 'in-1',
    audience: 'operator',
    titleKey: 'inbox.merchantPending.title',
    bodyKey: 'inbox.merchantPending.body',
    params: { name: 'Ibb Hypermarket' },
    at: '2026-09-02T12:54:00.000Z',
    unread: true,
    href: '/merchants?tab=pending',
  },
  {
    id: 'in-2',
    audience: 'operator',
    titleKey: 'inbox.fiExpiring.title',
    bodyKey: 'inbox.fiExpiring.body',
    params: { name: 'Yemen Kuwait Bank' },
    at: '2026-09-02T11:59:00.000Z',
    unread: false,
    href: '/institutions?tab=pending',
  },
  {
    id: 'in-3',
    audience: 'operator',
    titleKey: 'inbox.erpResubmitted.title',
    bodyKey: 'inbox.erpResubmitted.body',
    params: { name: 'SanaSoft ERP' },
    at: '2026-09-02T09:59:00.000Z',
    unread: false,
    href: '/erp-systems?tab=pending',
  },
  {
    id: 'in-4',
    audience: 'operator',
    titleKey: 'inbox.roleRequest.title',
    bodyKey: 'inbox.roleRequest.body',
    params: { name: 'Omar Saleh' },
    at: '2026-09-01T12:59:00.000Z',
    unread: false,
    href: '/operators',
  },
  {
    id: 'in-5',
    audience: 'operator',
    titleKey: 'inbox.auditFlag.title',
    bodyKey: 'inbox.auditFlag.body',
    params: { ip: '192.168.2.50' },
    at: '2026-09-01T10:59:00.000Z',
    unread: false,
    href: '/reports',
  },
  {
    id: 'in-6',
    audience: 'merchant',
    titleKey: 'inbox.paymentReceived.title',
    bodyKey: 'inbox.paymentReceived.body',
    params: { invoice: 'INV-88421' },
    at: '2026-09-02T12:50:00.000Z',
    unread: true,
    href: '/notification-delivery',
  },
  {
    id: 'in-7',
    audience: 'merchant',
    titleKey: 'inbox.pointApproved.title',
    bodyKey: 'inbox.pointApproved.body',
    params: { code: '10293' },
    at: '2026-09-02T10:10:00.000Z',
    unread: false,
    href: '/my-payment-points',
  },
  {
    id: 'in-8',
    audience: 'institution',
    titleKey: 'inbox.pointPending.title',
    bodyKey: 'inbox.pointPending.body',
    params: { name: 'Ibb Hypermarket' },
    at: '2026-09-02T12:40:00.000Z',
    unread: true,
    href: '/pp-approvals',
  },
  {
    id: 'in-9',
    audience: 'institution',
    titleKey: 'inbox.noteDelivered.title',
    bodyKey: 'inbox.noteDelivered.body',
    params: { invoice: 'INV-22018' },
    at: '2026-09-02T09:20:00.000Z',
    unread: false,
    href: '/notifications',
  },
];

export const SETTLEMENTS: Settlement[] = [
  { id: 'st-1', institutionName: 'Tadhamon Bank', merchantName: 'Al-Amal Pharmacies', occurredAt: '2026-08-31T16:00:00.000Z', amount: 48500, fee: 364, currency: 'YER', status: 'completed' },
  { id: 'st-2', institutionName: 'Tadhamon Bank', merchantName: 'Mukalla Clinics Group', occurredAt: '2026-08-30T19:44:00.000Z', amount: 72000, fee: 540, currency: 'YER', status: 'completed' },
  { id: 'st-3', institutionName: 'Tadhamon Bank', merchantName: 'Al-Saeed Trading House', occurredAt: '2026-08-30T18:02:00.000Z', amount: 950, fee: 7, currency: 'USD', status: 'completed' },
  { id: 'st-4', institutionName: 'CAC Bank', merchantName: 'Hodeidah Fuel Stations', occurredAt: '2026-08-31T10:05:00.000Z', amount: 3400, fee: 26, currency: 'SAR', status: 'completed' },
  { id: 'st-5', institutionName: 'Jawali Wallet', merchantName: 'Al-Amal Pharmacies', occurredAt: '2026-08-31T15:40:00.000Z', amount: 210.5, fee: 1.6, currency: 'SAR', status: 'pending' },
];

export const WEEKLY_ACTIVITY = [56, 91, 119, 70, 105, 126, 28];
export const WEEKLY_HIGHLIGHT_INDEX = 2;

export const FI_ACTIVITY: DashboardActivity[] = [
  {
    id: 'fa-1',
    at: '2026-08-31T16:51:00.000Z',
    activityKey: 'activity.ppApproved',
    merchant: 'Al-Amal Pharmacies',
    status: 'completed',
  },
  {
    id: 'fa-2',
    at: '2026-08-31T15:40:00.000Z',
    activityKey: 'activity.noteDelivered',
    merchant: 'Souq Taiz Electronics',
    status: 'delivered',
  },
  {
    id: 'fa-3',
    at: '2026-08-31T14:08:00.000Z',
    activityKey: 'activity.ppRejected',
    merchant: 'Aden Fresh Fisheries',
    status: 'rejected',
  },
  {
    id: 'fa-4',
    at: '2026-08-30T18:02:00.000Z',
    activityKey: 'activity.ppApproved',
    merchant: 'Mukalla Clinics Group',
    status: 'completed',
  },
  {
    id: 'fa-5',
    at: '2026-08-30T09:16:00.000Z',
    activityKey: 'activity.ppPending',
    merchant: 'Ibb Hypermarket',
    status: 'pending',
  },
];

export function profileFor(user: AuthUser): AccountProfile {
  const account = DEMO_ACCOUNTS.find((entry) => entry.user.id === user.id);
  const merchant = MERCHANTS.find((row) => row.id === user.orgId);
  return {
    name: user.name,
    email: user.email,
    jobTitleKey: user.jobTitleKey,
    audience: user.audience,
    role: user.role,
    orgName: user.orgName,
    city: account?.city ?? 'Sana’a',
    phone: account?.phone ?? '+967 1 000 000',
    merchant:
      user.audience === 'merchant'
        ? {
            businessName: merchant?.legalName ?? user.orgName ?? '',
            crNumber: merchant?.crNumber ?? '',
            erpSystem: merchant?.erpSystem ?? '',
            address: `${account?.city ?? 'Sana’a'}, Yemen`,
            officePhone: account?.phone ?? '',
            businessEmail: merchant?.email ?? user.email,
            contactName: user.name,
            contactRole: 'Finance lead',
            contactPhone: account?.phone ?? '',
            contactEmail: user.email,
          }
        : undefined,
    operator:
      user.audience === 'operator'
        ? { emailNotifications: true, smsNotifications: false }
        : undefined,
  };
}

export function resolvePointScope(user: AuthUser, requested = 'all'): string {
  if (user.audience === 'merchant') {
    return 'mine';
  }
  if (user.audience === 'institution') {
    return requested === 'pending' ? 'pending' : 'institution';
  }
  return requested || 'all';
}

export function scopedPoints(user: AuthUser, scope: string, q = ''): PaymentPoint[] {
  const resolved = resolvePointScope(user, scope);
  let rows = PAYMENT_POINTS;
  if (resolved === 'mine' && user.orgName) {
    rows = rows.filter((row) => row.merchantName === user.orgName);
  } else if ((resolved === 'institution' || resolved === 'pending') && user.orgName) {
    rows = rows.filter((row) => row.institutionName === user.orgName);
    if (resolved === 'pending') {
      rows = rows.filter((row) => row.status === 'pending');
    }
  }
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return rows;
  }
  return rows.filter((row) =>
    [row.pointCode, row.merchantName, row.institutionName, row.status, row.currency]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}

export function scopedNotifications(user: AuthUser, q = ''): PaymentNotification[] {
  let rows = NOTIFICATIONS;
  if (user.audience === 'merchant' && user.orgName) {
    rows = rows.filter((row) => row.merchantName === user.orgName);
  } else if (user.audience === 'institution' && user.orgName) {
    rows = rows.filter((row) => row.institutionName === user.orgName);
  }
  const needle = q.trim().toLowerCase();
  if (!needle) {
    return rows;
  }
  return rows.filter((row) =>
    [row.pointCode, row.merchantName, row.institutionName, row.invoice, row.status]
      .join(' ')
      .toLowerCase()
      .includes(needle),
  );
}

export function buildDashboard(user: AuthUser): DashboardPayload {
  const orgPoints = user.orgName
    ? PAYMENT_POINTS.filter((row) =>
        user.audience === 'merchant'
          ? row.merchantName === user.orgName
          : row.institutionName === user.orgName,
      )
    : [];
  const orgNotes = scopedNotifications(user);
  const integration =
    INTEGRATION_USERS.find((row) => row.organization === user.orgName) ?? INTEGRATION_USERS[0];

  return {
    audience: user.audience,
    slaRate: 94,
    slaOnTimeCount: 11,
    slaOverdueCount: 1,
    slaApprovedCount: 47,
    slaTotalCount: 50,
    pendingMerchantApprovals: MERCHANTS.filter((row) => row.status === 'pending').length,
    pendingFiApprovals: INSTITUTIONS.filter((row) => row.status === 'pending').length,
    pendingErpApprovals: ERPS.filter((row) => row.status === 'pending').length,
    activeMerchants: MERCHANTS.filter((row) => row.status === 'approved').length,
    weeklyActivity: WEEKLY_ACTIVITY,
    pendingPoints: PAYMENT_POINTS.filter((row) => row.status === 'pending').slice(0, 6),
    pendingMerchants: MERCHANTS.filter((row) => row.status === 'pending'),
    activePaymentPoints: orgPoints.filter((row) => row.status === 'approved').length,
    pendingPaymentPoints: orgPoints.filter((row) => row.status === 'pending').length,
    integrationUserStatus: integration?.status ?? 'inactive',
    notificationUserStatus: 'approved',
    recentNotifications: orgNotes.slice(0, 6),
    pendingPpApprovals: orgPoints.filter((row) => row.status === 'pending').length,
    approvedPaymentPoints: orgPoints.filter((row) => row.status === 'approved').length,
    notificationsThisMonth: orgNotes.length + (user.audience === 'institution' ? 18 : 0),
    recentActivity: FI_ACTIVITY,
  };
}
