/**
 * OpenAI function calling tool definitions for the AI Chat agent.
 * Each tool maps to a real DB query or action in the system.
 */

export const TOOL_DEFINITIONS = [
  // ─── READ TOOLS ────────────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'search_clients',
      description:
        'Search and list clients. Use this to find clients by name, status, emirate, VAT return cycle, or compliance issues. Returns a summarized list.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Partial name search' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
            description: 'Filter by client status',
          },
          emirate: {
            type: 'string',
            description: 'Filter by emirate (e.g. Dubai, Abu Dhabi, Sharjah)',
          },
          vatReturnCycle: {
            type: 'string',
            enum: ['MONTHLY', 'QUARTERLY'],
            description: 'Filter by VAT return cycle',
          },
          hasComplianceIssues: {
            type: 'boolean',
            description: 'Filter clients with compliance alerts',
          },
          limit: {
            type: 'number',
            description: 'Max number of results (default 20)',
          },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_client_details',
      description:
        'Get full details of a specific client including business info, documents, partners, managers, packages, and compliance status.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'The MongoDB ID of the client' },
          clientName: {
            type: 'string',
            description: 'Client name to search if ID is not known',
          },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_compliance_status',
      description:
        'Get compliance status across all clients or a specific client. Checks for expiring/expired documents (trade license, VAT certificate, Emirates IDs, passports), upcoming VAT filing deadlines, and corporate tax due dates.',
      parameters: {
        type: 'object',
        properties: {
          clientId: {
            type: 'string',
            description: 'Specific client ID (optional, omit for all clients)',
          },
          daysAhead: {
            type: 'number',
            description: 'Check for items expiring within this many days (default 30)',
          },
          includeExpired: {
            type: 'boolean',
            description: 'Include already expired items (default true)',
          },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_tasks',
      description:
        'Search and list tasks. Filter by status, client, employee, priority, due date, or overdue status.',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED'],
            description: 'Filter by task status',
          },
          clientId: { type: 'string', description: 'Filter by client ID' },
          clientName: { type: 'string', description: 'Filter by client name' },
          assignedToEmployeeId: {
            type: 'string',
            description: 'Filter by assigned employee ID',
          },
          assignedToName: {
            type: 'string',
            description: 'Filter by assigned employee name',
          },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
          },
          isOverdue: {
            type: 'boolean',
            description: 'Show only overdue tasks (past due date and not done)',
          },
          dueBefore: {
            type: 'string',
            description: 'ISO date string - tasks due before this date',
          },
          dueAfter: {
            type: 'string',
            description: 'ISO date string - tasks due after this date',
          },
          search: { type: 'string', description: 'Text search on task name' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_employee_workload',
      description:
        'Get employee workload and utilization. Shows hours logged, tasks assigned, utilization percentage, and availability.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: {
            type: 'string',
            description: 'Specific employee ID (omit for all employees)',
          },
          employeeName: {
            type: 'string',
            description: 'Employee name to search',
          },
          startDate: { type: 'string', description: 'ISO date string for period start' },
          endDate: { type: 'string', description: 'ISO date string for period end' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_invoice_summary',
      description:
        'Get invoice statistics and summary. Shows total revenue, outstanding amounts, overdue invoices, paid vs unpaid breakdown.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Filter by client ID' },
          status: {
            type: 'string',
            enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
          },
          startDate: { type: 'string', description: 'ISO date string' },
          endDate: { type: 'string', description: 'ISO date string' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_time_entries',
      description:
        'Get time entries (logged hours). Filter by employee, client, date range. Returns summary of hours and descriptions.',
      parameters: {
        type: 'object',
        properties: {
          employeeId: { type: 'string' },
          employeeName: { type: 'string' },
          clientId: { type: 'string' },
          clientName: { type: 'string' },
          startDate: { type: 'string', description: 'ISO date string' },
          endDate: { type: 'string', description: 'ISO date string' },
          limit: { type: 'number', description: 'Max entries (default 20)' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_dashboard_stats',
      description:
        'Get high-level dashboard KPIs including active clients, total packages, pending tasks, team utilization, and revenue overview.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_analytics',
      description:
        'Get financial analytics: package profitability, client profitability, or employee utilization metrics.',
      parameters: {
        type: 'object',
        properties: {
          analyticsType: {
            type: 'string',
            enum: ['package', 'client', 'employee'],
            description: 'Type of analytics to retrieve',
          },
          clientId: { type: 'string' },
          employeeId: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: ['analyticsType'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'search_employees',
      description: 'Search and list employees. Filter by name, designation, or active status.',
      parameters: {
        type: 'object',
        properties: {
          search: { type: 'string', description: 'Name or designation search' },
          isActive: { type: 'boolean' },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'get_packages',
      description: 'Get service packages for a client or all clients.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          clientName: { type: 'string' },
          status: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'EXPIRED', 'CANCELLED'],
          },
          type: {
            type: 'string',
            enum: ['RECURRING', 'ONE_TIME'],
          },
          limit: { type: 'number', description: 'Max results (default 20)' },
        },
      },
    },
  },

  // ─── WRITE TOOLS ────────────────────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'create_task',
      description:
        'Create a new task. ALWAYS ask the user to confirm the details before calling this. Only call after confirmation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Task name' },
          clientId: { type: 'string', description: 'Client ID' },
          packageId: { type: 'string', description: 'Package ID' },
          description: { type: 'string' },
          category: { type: 'string', description: 'Task category (e.g. VAT Filing, Bookkeeping)' },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Default MEDIUM',
          },
          dueDate: { type: 'string', description: 'ISO date string' },
          assignedTo: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of Employee IDs to assign',
          },
          confirmed: {
            type: 'boolean',
            description: 'Must be true - user has confirmed the creation',
          },
        },
        required: ['name', 'clientId', 'packageId', 'confirmed'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_bulk_tasks',
      description:
        'Create the same task for multiple clients at once (e.g. VAT filing tasks for all quarterly clients). ALWAYS confirm with user first.',
      parameters: {
        type: 'object',
        properties: {
          taskTemplate: {
            type: 'object',
            description: 'Task fields shared across all created tasks. Must include at minimum a name.',
            properties: {
              name: { type: 'string', description: 'Task name (required)' },
              description: { type: 'string' },
              category: { type: 'string' },
              priority: {
                type: 'string',
                enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
              },
              dueDate: { type: 'string', description: 'ISO date string' },
            },
          },
          clientIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of client IDs to create tasks for',
          },
          confirmed: {
            type: 'boolean',
            description: 'Must be true - user has confirmed',
          },
        },
        required: ['taskTemplate', 'clientIds', 'confirmed'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'update_task_status',
      description: 'Update the status of a task. Confirm with user before calling.',
      parameters: {
        type: 'object',
        properties: {
          taskId: { type: 'string', description: 'Task ID to update' },
          status: {
            type: 'string',
            enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'],
          },
          confirmed: { type: 'boolean' },
        },
        required: ['taskId', 'status', 'confirmed'],
      },
    },
  },

  {
    type: 'function',
    function: {
      name: 'create_invoice_draft',
      description:
        'Create a draft invoice for a client based on unbilled time entries. Confirm with user before calling.',
      parameters: {
        type: 'object',
        properties: {
          clientId: { type: 'string', description: 'Client ID' },
          notes: { type: 'string', description: 'Invoice notes' },
          dueDate: { type: 'string', description: 'ISO date string for payment due date' },
          confirmed: { type: 'boolean' },
        },
        required: ['clientId', 'confirmed'],
      },
    },
  },
];

/**
 * Returns tools filtered to only those appropriate for the user role.
 * Write tools are only available to ADMIN and MANAGER.
 */
export const getToolsForRole = (role) => {
  const writeTools = ['create_task', 'create_bulk_tasks', 'update_task_status', 'create_invoice_draft'];
  if (role === 'EMPLOYEE') {
    return TOOL_DEFINITIONS.filter((t) => !writeTools.includes(t.function.name));
  }
  return TOOL_DEFINITIONS;
};
