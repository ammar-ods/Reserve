export type Lang = 'ar' | 'en';

// Arabic is the production language of the system. English exists only so the
// Super Admin can flip the interface text with the En/Ar switch.
export const DEFAULT_LANG: Lang = 'ar';

export const TRANSLATIONS: Record<string, { ar: string; en: string }> = {
  // Brand & shell
  'brand.place': { ar: 'محمية المرزوم', en: 'Al Marzoum Reserve' },
  'brand.system': { ar: 'حجوزات محمية المرزوم', en: 'Al Marzoum Reserve Bookings' },

  // Login
  'login.username': { ar: 'اسم المستخدم', en: 'Username' },
  'login.password': { ar: 'كلمة المرور', en: 'Password' },
  'login.submit': { ar: 'تسجيل الدخول', en: 'Sign In' },
  'login.loading': { ar: 'جارٍ تسجيل الدخول...', en: 'Signing in...' },
  'login.invalid': { ar: 'اسم المستخدم أو كلمة المرور غير صحيحة', en: 'Invalid username or password' },
  'login.required': { ar: 'الرجاء إدخال اسم المستخدم وكلمة المرور', en: 'Please enter a username and password' },

  // Navbar
  'nav.dashboard': { ar: 'الرئيسية', en: 'Dashboard' },
  'nav.auditLog': { ar: 'سجل العمليات', en: 'Audit Log' },
  'nav.settings': { ar: 'الإعدادات', en: 'Settings' },
  'nav.logout': { ar: 'تسجيل الخروج', en: 'Logout' },
  'nav.live': { ar: 'متصل', en: 'Live' },
  'nav.connecting': { ar: 'جارٍ الاتصال', en: 'Connecting' },
  'nav.language': { ar: 'تغيير اللغة', en: 'Switch language' },

  // Roles
  'role.SUPER_ADMIN': { ar: 'المشرف العام', en: 'Super Admin' },
  'role.ADMIN': { ar: 'مشرف', en: 'Admin' },
  'role.HOST': { ar: 'موظف', en: 'Host' },

  // Dashboard & campsites
  'dash.campsites': { ar: 'المخيمات', en: 'Campsites' },
  'dash.loading': { ar: 'جارٍ التحميل...', en: 'Loading...' },
  'card.activeBookings': { ar: 'حجز نشط', en: 'active bookings' },
  'card.held': { ar: 'قيد الحجز', en: 'held' },
  'card.manage': { ar: 'إدارة الحجوزات', en: 'Manage bookings' },
  'card.cap': { ar: 'الحد اليومي', en: 'Daily cap' },
  'card.perDay': { ar: 'يوميًا', en: '/day' },

  // Site page
  'site.back': { ar: 'رجوع إلى المخيمات', en: 'Back to campsites' },
  'site.newBooking': { ar: 'حجز جديد', en: 'New booking' },
  'site.reservations': { ar: 'الحجوزات', en: 'Reservations' },
  'site.settings': { ar: 'الحدود والأسعار', en: 'Caps & prices' },
  'site.loading': { ar: 'جارٍ تحميل بيانات المخيم...', en: 'Loading campsite data...' },

  // Stats
  'stats.global': { ar: 'إحصائيات عامة', en: 'Overall statistics' },
  'stats.site': { ar: 'إحصائيات المخيم', en: 'Campsite statistics' },
  'stats.reservations': { ar: 'الحجوزات', en: 'Reservations' },
  'stats.guests': { ar: 'الزوار', en: 'Guests' },
  'stats.tents': { ar: 'الخيام', en: 'Tents' },
  'stats.cars': { ar: 'السيارات', en: 'Cars' },
  'stats.birds': { ar: 'الحبارى', en: 'Houbara' },
  'stats.rabbits': { ar: 'الأرانب البرية', en: 'Wild rabbits' },
  'stats.total': { ar: 'إجمالي المبالغ', en: 'Total amount' },
  'stats.deposits': { ar: 'العرابين المستلمة', en: 'Deposits received' },
  'stats.countries': { ar: 'دول الزوار', en: 'Visitor countries' },
  'stats.noCountries': { ar: 'لا توجد بيانات', en: 'No data yet' },
  'stats.pending': { ar: 'قيد الانتظار', en: 'Pending' },
  'stats.confirmed': { ar: 'مؤكد', en: 'Confirmed' },
  'stats.cancelled': { ar: 'ملغي', en: 'Cancelled' },

  // Reservation table
  'col.id': { ar: 'رقم الحجز', en: 'Reservation no.' },
  'col.customer': { ar: 'الزائر / الجوال', en: 'Guest / Phone' },
  'col.dates': { ar: 'تاريخ الزيارة', en: 'Visit dates' },
  'col.guests': { ar: 'الزوار', en: 'Guests' },
  'col.items': { ar: 'المستأجرات', en: 'Rentals' },
  'col.total': { ar: 'الإجمالي', en: 'Total' },
  'col.deposit': { ar: 'العربون', en: 'Deposit' },
  'col.status': { ar: 'الحالة', en: 'Status' },
  'col.host': { ar: 'الموظف', en: 'Host' },
  'col.actions': { ar: 'الإجراءات', en: 'Actions' },
  'table.search': { ar: 'بحث بالاسم أو الجوال أو رقم الحجز...', en: 'Search by name, phone or reservation no...' },
  'table.clear': { ar: 'مسح', en: 'Clear' },
  'table.export': { ar: 'تصدير Excel', en: 'Export to Excel' },
  'table.empty': { ar: 'لا توجد حجوزات مطابقة', en: 'No matching reservations' },
  'table.to': { ar: 'إلى', en: 'to' },
  'filter.ALL': { ar: 'الكل', en: 'All' },
  'filter.CONFIRMED': { ar: 'مؤكد', en: 'Confirmed' },
  'filter.PENDING': { ar: 'قيد الانتظار', en: 'Pending' },
  'filter.CANCELLED': { ar: 'ملغي', en: 'Cancelled' },
  'status.PENDING': { ar: 'قيد الانتظار', en: 'Pending' },
  'status.CONFIRMED': { ar: 'مؤكد', en: 'Confirmed' },
  'status.CANCELLED': { ar: 'ملغي', en: 'Cancelled' },
  'action.confirm': { ar: 'تأكيد', en: 'Confirm' },
  'action.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'action.edit': { ar: 'تعديل', en: 'Edit' },
  'items.none': { ar: 'لا شيء', en: 'None' },
  'deposit.none': { ar: 'لم يُستلم', en: 'Not received' },

  // Booking modal
  'booking.step1': { ar: 'اختيار تاريخ الحجز', en: 'Select booking dates' },
  'booking.step2': { ar: 'بيانات الحجز', en: 'Booking details' },
  'booking.edit': { ar: 'تعديل الحجز', en: 'Edit booking' },
  'booking.in': { ar: 'الحجز في', en: 'Booking at' },
  'booking.visit': { ar: 'الزيارة', en: 'Visit' },
  'booking.lockedFor': { ar: 'محجوز مؤقتًا لـ', en: 'Held for' },
  'booking.next': { ar: 'التالي: بيانات الحجز', en: 'Next: booking details' },
  'booking.back': { ar: 'رجوع إلى التقويم', en: 'Back to calendar' },
  'booking.save': { ar: 'حفظ الحجز', en: 'Save booking' },
  'booking.saveEdit': { ar: 'حفظ التعديلات', en: 'Save changes' },
  'booking.saving': { ar: 'جارٍ الحفظ...', en: 'Saving...' },
  'booking.close': { ar: 'إغلاق', en: 'Close' },
  'booking.checkIn': { ar: 'تاريخ الوصول', en: 'Check-in' },
  'booking.pickCheckout': { ar: 'الرجاء اختيار تاريخ المغادرة', en: 'Please pick the check-out date' },
  'booking.locking': { ar: 'جارٍ تثبيت التواريخ...', en: 'Holding the dates...' },
  'booking.locked': { ar: 'تم تثبيت التواريخ وإخفاؤها عن بقية الموظفين', en: 'Dates are held and greyed out for other hosts' },
  'booking.selected': { ar: 'مختار', en: 'Selected' },
  'booking.heldByOther': { ar: 'محجوز مؤقتًا من موظف آخر', en: 'Held by another host' },
  'booking.full': { ar: 'مكتمل', en: 'Full' },
  'booking.dateUnavailable': { ar: 'التاريخ غير متاح', en: 'Date unavailable' },
  'booking.pastDate': { ar: 'تاريخ سابق', en: 'Past date' },
  'booking.capacityFull': { ar: 'اكتمل العدد', en: 'Capacity reached' },
  'booking.nameRequired': { ar: 'الرجاء إدخال اسم الزائر ورقم الجوال', en: 'Please enter the guest name and phone number' },
  'booking.total': { ar: 'إجمالي المستأجرات', en: 'Rentals total' },
  'booking.depositHint': { ar: 'العربون اختياري ولا يُعتمد إلا عند استلامه', en: 'Deposit is optional and only counts once received' },

  // Fields
  'field.customerName': { ar: 'اسم الزائر', en: 'Guest name' },
  'field.phone': { ar: 'رقم الجوال', en: 'Phone number' },
  'field.country': { ar: 'الدولة', en: 'Country' },
  'field.guests': { ar: 'عدد الزوار', en: 'Guests count' },
  'field.tents': { ar: 'عدد الخيام', en: 'Tents count' },
  'field.cars': { ar: 'عدد السيارات', en: 'Cars count' },
  'field.birds': { ar: 'عدد الحبارى', en: 'Houbara count' },
  'field.rabbits': { ar: 'عدد الأرانب البرية', en: 'Wild rabbits count' },
  'field.notes': { ar: 'ملاحظات', en: 'Notes' },
  'field.deposit': { ar: 'العربون', en: 'Deposit' },
  'field.total': { ar: 'الإجمالي', en: 'Total' },
  'field.status': { ar: 'الحالة', en: 'Status' },
  'field.startDate': { ar: 'تاريخ الوصول', en: 'Check-in date' },
  'field.endDate': { ar: 'تاريخ المغادرة', en: 'Check-out date' },
  'field.campsite': { ar: 'المخيم', en: 'Campsite' },
  'field.dailyCapacity': { ar: 'الحد اليومي', en: 'Daily cap' },
  'field.pageTitle': { ar: 'عنوان النظام', en: 'System title' },
  'field.priceTent': { ar: 'سعر الخيمة', en: 'Tent price' },
  'field.priceCar': { ar: 'سعر السيارة', en: 'Car price' },
  'field.priceBird': { ar: 'سعر الحبارى', en: 'Houbara price' },
  'field.priceRabbit': { ar: 'سعر الأرنب البري', en: 'Wild rabbit price' },
  'field.tableHeaders': { ar: 'عناوين أعمدة الجدول', en: 'Table column headers' },
  'field.role': { ar: 'الصلاحية', en: 'Role' },
  'field.username': { ar: 'اسم المستخدم', en: 'Username' },
  'field.password': { ar: 'كلمة المرور', en: 'Password' },
  'field.optional': { ar: 'اختياري', en: 'optional' },

  // Confirm deposit popup
  'confirmModal.title': { ar: 'تأكيد الحجز واستلام العربون', en: 'Confirm booking & deposit' },
  'confirmModal.hint': {
    ar: 'لا يتم تأكيد الحجز إلا بعد استلام العربون. يُرجى إدخال المبلغ المستلم فعليًا.',
    en: 'A booking is only confirmed once the deposit is received. Enter the amount actually received.',
  },
  'confirmModal.received': { ar: 'المبلغ المستلم', en: 'Amount received' },
  'confirmModal.agreed': { ar: 'العربون المتفق عليه', en: 'Agreed deposit' },
  'confirmModal.submit': { ar: 'تأكيد الحجز', en: 'Confirm booking' },
  'confirmModal.required': { ar: 'الرجاء إدخال مبلغ العربون المستلم', en: 'Please enter the received deposit amount' },

  // Admin settings modal
  'settings.title': { ar: 'إعدادات النظام', en: 'System settings' },
  'settings.caps': { ar: 'الحد اليومي للحجوزات في كل مخيم', en: 'Daily reservation cap per campsite' },
  'settings.capsHint': {
    ar: 'تصبح التواريخ غير متاحة تلقائيًا عند وصول الحجوزات في أي يوم إلى هذا الحد.',
    en: 'Dates become unavailable automatically once bookings on any single day reach this limit.',
  },
  'settings.prices': { ar: 'أسعار المستأجرات', en: 'Rental unit prices' },
  'settings.pricesHint': {
    ar: 'يُحسب إجمالي كل حجز تلقائيًا من هذه الأسعار.',
    en: 'Each booking total is calculated automatically from these prices.',
  },
  'settings.view': { ar: 'عنوان النظام وأسماء الأعمدة', en: 'System title & column names' },
  'settings.accounts': { ar: 'الحسابات', en: 'Accounts' },
  'settings.accountsHint': {
    ar: 'إنشاء حسابات الموظفين والمشرفين باسم مستخدم وكلمة مرور فقط.',
    en: 'Create host and admin accounts with a username and password only.',
  },
  'settings.save': { ar: 'حفظ الإعدادات', en: 'Save settings' },
  'settings.saving': { ar: 'جارٍ الحفظ...', en: 'Saving...' },
  'settings.saved': { ar: 'تم حفظ الإعدادات بنجاح', en: 'Settings saved successfully' },
  'settings.cancel': { ar: 'إلغاء', en: 'Cancel' },
  'account.create': { ar: 'إنشاء الحساب', en: 'Create account' },
  'account.creating': { ar: 'جارٍ الإنشاء...', en: 'Creating...' },
  'account.created': { ar: 'تم إنشاء الحساب', en: 'Account created' },
  'account.existing': { ar: 'الحسابات الحالية', en: 'Existing accounts' },
  'account.passwordHint': { ar: '٦ أحرف على الأقل', en: 'At least 6 characters' },

  // Audit log
  'audit.title': { ar: 'سجل العمليات', en: 'System audit log' },
  'audit.search': { ar: 'بحث في السجل...', en: 'Search the log...' },
  'audit.count': { ar: 'عدد الأحداث', en: 'Events' },
  'audit.refresh': { ar: 'تحديث', en: 'Refresh' },
  'audit.loading': { ar: 'جارٍ تحميل الأحداث...', en: 'Loading events...' },
  'audit.empty': { ar: 'لا توجد أحداث', en: 'No events found' },
  'audit.col.time': { ar: 'الوقت', en: 'Time' },
  'audit.col.action': { ar: 'الإجراء', en: 'Action' },
  'audit.col.user': { ar: 'المستخدم', en: 'User' },
  'audit.col.target': { ar: 'العنصر', en: 'Target' },
  'audit.col.campsite': { ar: 'المخيم', en: 'Campsite' },
  'audit.detail.title': { ar: 'تفاصيل الحدث', en: 'Event details' },
  'audit.detail.by': { ar: 'بواسطة', en: 'By' },
  'audit.detail.when': { ar: 'التاريخ والوقت', en: 'Date & time' },
  'audit.detail.description': { ar: 'الوصف', en: 'Description' },
  'audit.detail.changes': { ar: 'ما تم تعديله', en: 'What changed' },
  'audit.detail.field': { ar: 'الحقل', en: 'Field' },
  'audit.detail.before': { ar: 'قبل', en: 'Before' },
  'audit.detail.after': { ar: 'بعد', en: 'After' },
  'audit.detail.noChanges': { ar: 'لا توجد تغييرات مفصلة لهذا الحدث', en: 'No field-level changes for this event' },
  'audit.detail.hint': { ar: 'اضغط على أي حدث لعرض تفاصيله', en: 'Click any event to see its details' },
  'action.CREATE': { ar: 'إضافة', en: 'Created' },
  'action.UPDATE': { ar: 'تعديل', en: 'Updated' },
  'action.CANCEL': { ar: 'إلغاء', en: 'Cancelled' },
  'action.DELETE': { ar: 'حذف', en: 'Deleted' },
  'action.LOCK_ACQUIRED': { ar: 'تثبيت تواريخ', en: 'Dates held' },
  'action.LOCK_RELEASED': { ar: 'تحرير تواريخ', en: 'Dates released' },
  'action.SETTING_UPDATE': { ar: 'تعديل إعدادات', en: 'Settings updated' },
  'target.RESERVATION': { ar: 'حجز', en: 'Reservation' },
  'target.CAMPSITE': { ar: 'مخيم', en: 'Campsite' },
  'target.SETTINGS': { ar: 'إعدادات', en: 'Settings' },
  'target.USER': { ar: 'حساب', en: 'Account' },
  'target.LOCK': { ar: 'حجز مؤقت', en: 'Hold' },

  // Server error codes
  'error.MISSING_CREDENTIALS': { ar: 'الرجاء إدخال اسم المستخدم وكلمة المرور', en: 'Please enter a username and password' },
  'error.INVALID_CREDENTIALS': { ar: 'اسم المستخدم أو كلمة المرور غير صحيحة', en: 'Invalid username or password' },
  'error.FORBIDDEN': { ar: 'لا تملك صلاحية تنفيذ هذا الإجراء', en: 'You are not allowed to do this' },
  'error.MISSING_FIELDS': { ar: 'الرجاء إكمال جميع الحقول المطلوبة', en: 'Please complete all required fields' },
  'error.USERNAME_TAKEN': { ar: 'اسم المستخدم مستخدم مسبقًا', en: 'This username already exists' },
  'error.WEAK_PASSWORD': { ar: 'كلمة المرور يجب أن تكون ٦ أحرف على الأقل', en: 'Password must be at least 6 characters' },
  'error.INVALID_ROLE': { ar: 'الصلاحية غير صحيحة', en: 'Invalid role' },
  'error.CAPACITY_REACHED': { ar: 'اكتمل العدد المسموح في تاريخ {date}', en: 'The daily limit is reached on {date}' },
  'error.INVALID_DATES': { ar: 'تواريخ غير صحيحة، يجب أن يكون تاريخ المغادرة بعد الوصول', en: 'Invalid dates: check-out must be after check-in' },
  'error.NOT_FOUND': { ar: 'العنصر غير موجود', en: 'Record not found' },
  'error.GENERIC': { ar: 'حدث خطأ غير متوقع', en: 'Something went wrong' },

  // Misc
  'common.currency': { ar: 'ر.س', en: 'SAR' },
  'common.none': { ar: '—', en: '—' },
  'common.yes': { ar: 'نعم', en: 'Yes' },
  'common.no': { ar: 'لا', en: 'No' },
  'common.networkError': { ar: 'تعذر الاتصال بالخادم', en: 'Network error' },
  'common.saveFailed': { ar: 'تعذر حفظ البيانات', en: 'Could not save the data' },
};

export type TranslationKey = keyof typeof TRANSLATIONS;

export function translate(key: string, lang: Lang, vars?: Record<string, string | number>): string {
  const entry = TRANSLATIONS[key];
  let text = entry ? entry[lang] : key;
  if (vars) {
    Object.entries(vars).forEach(([name, value]) => {
      text = text.replace(new RegExp(`{${name}}`, 'g'), String(value));
    });
  }
  return text;
}

// API routes answer with stable error codes, translated here for display.
export function translateError(
  code: string | undefined | null,
  lang: Lang,
  vars?: Record<string, string | number>
): string {
  if (!code) return translate('error.GENERIC', lang);
  const key = `error.${code}`;
  if (TRANSLATIONS[key]) return translate(key, lang, vars);
  return code;
}

export function formatMoney(amount: number | null | undefined, lang: Lang): string {
  const value = Number(amount || 0);
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return lang === 'ar' ? `${formatted} ${TRANSLATIONS['common.currency'].ar}` : `${TRANSLATIONS['common.currency'].en} ${formatted}`;
}
