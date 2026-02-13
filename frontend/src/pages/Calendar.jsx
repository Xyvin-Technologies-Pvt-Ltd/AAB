import { useState, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/layout/AppLayout";
import { tasksApi } from "@/api/tasks";
import { clientsApi } from "@/api/clients";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { LoaderWithText } from "@/components/Loader";
import {
  CalendarCheck,
  FileText,
  Receipt,
  CreditCard,
  User,
  Building2,
} from "lucide-react";
import { CalendarSubscription } from "@/components/CalendarSubscription";

// Event type colors
const eventTypeColors = {
  CORPORATE_TAX: "#dc2626", // red
  VAT_SUBMISSION: "#2563eb", // blue
  PASSPORT_EXPIRY: "#ea580c", // orange
  EID_EXPIRY: "#7c3aed", // purple
  TASK: "#6b7280", // gray (will be overridden by priority)
};

// Task priority colors
const priorityColors = {
  URGENT: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#eab308",
  LOW: "#6b7280",
};

export const Calendar = () => {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [view, setView] = useState("dayGridMonth");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [dateRange, setDateRange] = useState(() => {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 100 }),
  });

  const { data: calendarEventsData, isLoading: calendarLoading } = useQuery({
    queryKey: [
      "calendar-events",
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
      selectedClientId,
    ],
    queryFn: () =>
      clientsApi.getCalendarEvents({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        clientId: selectedClientId || undefined,
      }),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: [
      "calendar-tasks",
      dateRange.start.toISOString(),
      dateRange.end.toISOString(),
      selectedClientId,
    ],
    queryFn: () =>
      tasksApi.getCalendarTasks({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
        clientId: selectedClientId || undefined,
      }),
  });

  const clients = clientsData?.data?.clients || [];
  const renewalEvents = calendarEventsData?.data?.events || [];
  const tasks = tasksData?.data?.tasks || [];

  // Combine and format events for FullCalendar
  const events = useMemo(() => {
    const allEvents = [];

    // Add renewal events
    renewalEvents.forEach((event) => {
      allEvents.push({
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: true,
        extendedProps: {
          type: event.type,
          clientId: event.clientId,
          clientName: event.clientName,
          metadata: event.metadata,
        },
        backgroundColor: eventTypeColors[event.type] || "#6b7280",
        borderColor: eventTypeColors[event.type] || "#6b7280",
        textColor: "#ffffff",
      });
    });

    // Add tasks
    tasks.forEach((task) => {
      const dueDate = task.dueDate
        ? new Date(task.dueDate)
        : new Date(task.createdAt);
      const priority = task.priority || "MEDIUM";
      const color = priorityColors[priority] || priorityColors.MEDIUM;

      allEvents.push({
        id: `task-${task._id}`,
        title: task.name,
        start: dueDate,
        end: dueDate,
        allDay: true,
        extendedProps: {
          type: "TASK",
          taskId: task._id,
          clientId: task.clientId?._id || task.clientId,
          clientName: task.clientId?.name || "Unknown",
          priority,
          isRecurring: task.isRecurring,
        },
        backgroundColor: color,
        borderColor: color,
        textColor: "#ffffff",
      });
    });

    // Distribute same-day events by adding a small time offset
    // Group events by date
    const eventsByDate = {};
    allEvents.forEach((event) => {
      const dateKey = new Date(event.start).toISOString().split("T")[0];
      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = [];
      }
      eventsByDate[dateKey].push(event);
    });

    // For same-day events, distribute them visually
    const distributedEvents = [];
    Object.keys(eventsByDate).forEach((dateKey) => {
      const dayEvents = eventsByDate[dateKey];
      if (dayEvents.length > 1) {
        // Sort by type priority (tax > vat > passport > eid > task)
        const typePriority = {
          CORPORATE_TAX: 1,
          VAT_SUBMISSION: 2,
          PASSPORT_EXPIRY: 3,
          EID_EXPIRY: 4,
          TASK: 5,
        };

        dayEvents.sort((a, b) => {
          const aPriority =
            typePriority[a.extendedProps.type] || typePriority.TASK;
          const bPriority =
            typePriority[b.extendedProps.type] || typePriority.TASK;
          return aPriority - bPriority;
        });

        // Assign visual order (FullCalendar will handle stacking)
        dayEvents.forEach((event, index) => {
          distributedEvents.push(event);
        });
      } else {
        distributedEvents.push(dayEvents[0]);
      }
    });

    return distributedEvents.sort((a, b) => a.start - b.start);
  }, [renewalEvents, tasks]);

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    const clientId = event.extendedProps.clientId;

    if (clientId) {
      navigate(`/clients/${clientId}`);
    }
  };

  const handleDatesSet = (dateInfo) => {
    setView(dateInfo.view.type);
    // Use FullCalendar's actual visible date range
    setDateRange({
      start: dateInfo.start,
      end: dateInfo.end,
    });
  };

  const goToToday = () => {
    if (calendarRef.current) {
      const calendarApi = calendarRef.current.getApi();
      calendarApi.today();
    }
  };

  const isLoading = calendarLoading || tasksLoading;

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600 mt-1">
              View deadlines, renewals, and recurring tasks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </select>
            <Button variant="outline" onClick={goToToday}>
              <CalendarCheck className="h-4 w-4 mr-2" />
              Today
            </Button>
          </div>
        </div>

        <CalendarSubscription />

        {/* Calendar */}
        {isLoading ? (
          <div className="py-12">
            <LoaderWithText text="Loading calendar..." />
          </div>
        ) : (
          <Card>
            <div className="p-4">
              <FullCalendar
                ref={calendarRef}
                plugins={[
                  dayGridPlugin,
                  timeGridPlugin,
                  listPlugin,
                  interactionPlugin,
                ]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left: "prev,next today",
                  center: "title",
                  right: "dayGridMonth,timeGridWeek,timeGridDay,listMonth",
                }}
                height="auto"
                events={events}
                eventClick={handleEventClick}
                datesSet={handleDatesSet}
                eventDisplay="block"
                eventTimeFormat={{
                  hour: "2-digit",
                  minute: "2-digit",
                  meridiem: "short",
                }}
                dayMaxEvents={3}
                moreLinkClick="popover"
                eventContent={(eventInfo) => {
                  const event = eventInfo.event;
                  const title = event.title;

                  return {
                    html: `
                      <div class="px-1 py-0.5 text-xs font-medium truncate" style="color: white;">
                        ${title}
                      </div>
                    `,
                  };
                }}
                eventClassNames="cursor-pointer hover:opacity-80 transition-opacity"
                className="fc-theme-standard"
              />
            </div>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Event Type Legend
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: eventTypeColors.CORPORATE_TAX }}
                />
                <div className="flex items-center gap-1">
                  <Receipt className="h-3 w-3 text-gray-600" />
                  <span className="text-sm text-gray-600">Corporate Tax</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: eventTypeColors.VAT_SUBMISSION }}
                />
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 text-gray-600" />
                  <span className="text-sm text-gray-600">VAT Submission</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: eventTypeColors.PASSPORT_EXPIRY }}
                />
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-gray-600" />
                  <span className="text-sm text-gray-600">Passport Expiry</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: eventTypeColors.EID_EXPIRY }}
                />
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3 text-gray-600" />
                  <span className="text-sm text-gray-600">EID Expiry</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: priorityColors.MEDIUM }}
                />
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 text-gray-600" />
                  <span className="text-sm text-gray-600">Tasks</span>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">
                Task Priority Colors
              </h4>
              <div className="flex flex-wrap gap-4">
                {Object.entries(priorityColors).map(([priority, color]) => (
                  <div key={priority} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-gray-600">{priority}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <style>{`
        .fc-theme-standard .fc-scrollgrid {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }
        .fc-theme-standard td,
        .fc-theme-standard th {
          border-color: #e5e7eb;
        }
        .fc-daygrid-day-frame {
          min-height: 80px;
        }
        .fc-event {
          border-radius: 0.25rem;
          padding: 2px 4px;
          font-size: 0.75rem;
        }
        .fc-event-title {
          font-weight: 500;
        }
        .fc-button {
          background-color: #6366f1;
          border-color: #6366f1;
          padding: 0.375rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.375rem;
        }
        .fc-button:hover {
          background-color: #4f46e5;
          border-color: #4f46e5;
        }
        .fc-button-active {
          background-color: #4338ca;
          border-color: #4338ca;
        }
        .fc-toolbar-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }
        .fc-daygrid-event {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .fc-more-link {
          font-weight: 500;
          color: #6366f1;
        }
      `}</style>
    </AppLayout>
  );
};
