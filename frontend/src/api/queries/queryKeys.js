export const queryKeys = {
  clients: {
    all: ['clients'],
    list: (filters) => ['clients', 'list', filters],
    detail: (id) => ['clients', 'detail', id],
    count: () => ['clients', 'count'],
    alerts: (params) => ['clients', 'alerts', params],
    compliance: (id) => ['clients', 'compliance', id],
    calendar: (params) => ['clients', 'calendar', params],
    calendarEvents: (params) => ['clients', 'calendar-events', params],
    submissionDates: () => ['clients', 'submission-dates'],
    profitability: (params) => ['clients', 'profitability', params],
    emaraTaxCredentials: (id) => ['clients', 'detail', id, 'emaratax-credentials'],
  },
  tasks: {
    all: ['tasks'],
    list: (filters) => ['tasks', 'list', filters],
    detail: (id) => ['tasks', 'detail', id],
    dashboard: () => ['tasks', 'dashboard'],
    workload: (params) => ['tasks', 'workload', params],
    archived: (params) => ['tasks', 'archived', params],
    calendar: (params) => ['tasks', 'calendar', params],
    byEmployee: (employeeId) => ['tasks', 'employee', employeeId],
  },
  employees: {
    all: ['employees'],
    list: (filters) => ['employees', 'list', filters],
    detail: (id) => ['employees', 'detail', id],
  },
  teams: {
    all: ['teams'],
    list: (filters) => ['teams', 'list', filters],
    detail: (id) => ['teams', 'detail', id],
  },
  invoices: {
    all: ['invoices'],
    list: (filters) => ['invoices', 'list', filters],
    detail: (id) => ['invoices', 'detail', id],
    unbilledTimeEntries: (clientId) => ['invoices', 'unbilled-time-entries', clientId],
  },
  packages: {
    all: ['packages'],
    list: (filters) => ['packages', 'list', filters],
    detail: (id) => ['packages', 'detail', id],
    byClient: (clientId) => ['packages', 'by-client', clientId],
  },
  timeEntries: {
    all: ['time-entries'],
    list: (filters) => ['time-entries', 'list', filters],
    infinite: (filters) => ['time-entries', 'infinite', filters],
    detail: (id) => ['time-entries', 'detail', id],
    running: (employeeId) => ['time-entries', 'running', employeeId],
    byEmployee: (employeeId, dateRange) => ['time-entries', 'employee', employeeId, dateRange],
  },
  analytics: {
    all: ['analytics'],
    dashboard: () => ['analytics', 'dashboard'],
    dashboardStatistics: () => ['analytics', 'dashboard-statistics'],
    clients: (params) => ['analytics', 'clients', params],
    employees: (params) => ['analytics', 'employees', params],
    packages: (params) => ['analytics', 'packages', params],
    client: (clientId, params) => ['analytics', 'client', clientId, params],
    employee: (employeeId, params) => ['analytics', 'employee', employeeId, params],
    package: (packageId, params) => ['analytics', 'package', packageId, params],
  },
  notifications: {
    all: ['notifications'],
    list: (params) => ['notifications', 'list', params],
    infinite: (params) => ['notifications', 'infinite', params],
    unreadCount: () => ['notifications', 'unread-count'],
  },
  services: {
    all: ['services'],
    list: (params) => ['services', 'list', params],
    detail: (id) => ['services', 'detail', id],
  },
  activities: {
    all: ['activities'],
    list: (params) => ['activities', 'list', params],
    detail: (id) => ['activities', 'detail', id],
  },
  calendar: {
    all: ['calendar'],
    token: () => ['calendar', 'token'],
  },
  aiChat: {
    sessions: () => ['ai-chat', 'sessions'],
    session: (id) => ['ai-chat', 'session', id],
    insights: () => ['ai-chat', 'insights'],
  },
  auth: {
    me: () => ['auth', 'me'],
  },
};

export const getNextPageFromPagination = (lastPage) => {
  const pagination = lastPage?.data?.pagination ?? lastPage?.pagination;
  if (!pagination) return undefined;
  const { page, pages } = pagination;
  return page < pages ? page + 1 : undefined;
};
