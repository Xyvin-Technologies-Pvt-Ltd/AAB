import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/layout/AppLayout";
import { tasksApi } from "@/api/tasks";
import { clientsApi } from "@/api/clients";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { CalendarCheck, Repeat } from "lucide-react";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const priorityColors = {
  URGENT: "#dc2626",
  HIGH: "#ea580c",
  MEDIUM: "#eab308",
  LOW: "#6b7280",
};

export const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState("month");
  const [selectedClientId, setSelectedClientId] = useState("");

  const { data: clientsData } = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientsApi.getAll({ limit: 100 }),
  });

  const startDate = new Date(currentDate);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(currentDate);
  if (view === "month") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else if (view === "week") {
    endDate.setDate(endDate.getDate() + 7);
  } else {
    endDate.setDate(endDate.getDate() + 1);
  }

  const { data: calendarData, isLoading } = useQuery({
    queryKey: [
      "calendar-tasks",
      startDate.toISOString(),
      endDate.toISOString(),
      selectedClientId,
    ],
    queryFn: () =>
      tasksApi.getCalendarTasks({
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        clientId: selectedClientId || undefined,
      }),
  });

  const clients = clientsData?.data?.clients || [];
  const tasks = calendarData?.data?.tasks || [];

  const events = tasks.map((task) => {
    const dueDate = task.dueDate
      ? new Date(task.dueDate)
      : new Date(task.createdAt);
    return {
      id: task._id,
      title: task.name,
      start: dueDate,
      end: dueDate,
      allDay: true,
      resource: task,
      style: {
        backgroundColor: priorityColors[task.priority] || priorityColors.MEDIUM,
        borderColor: priorityColors[task.priority] || priorityColors.MEDIUM,
      },
    };
  });

  const eventStyleGetter = (event) => {
    return {
      style: {
        backgroundColor: event.style.backgroundColor,
        borderColor: event.style.borderColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "none",
        display: "block",
        padding: "2px 4px",
      },
    };
  };

  const handleNavigate = (date) => {
    setCurrentDate(date);
  };

  const handleViewChange = (newView) => {
    setView(newView);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600 mt-1">
              View deadlines and recurring tasks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
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

        {/* View Toggle */}
        <Card>
          <div className="p-4">
            <div className="flex gap-2">
              <Button
                variant={view === "day" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("day")}
              >
                Day
              </Button>
              <Button
                variant={view === "week" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("week")}
              >
                Week
              </Button>
              <Button
                variant={view === "month" ? "default" : "outline"}
                size="sm"
                onClick={() => handleViewChange("month")}
              >
                Month
              </Button>
            </div>
          </div>
        </Card>

        {/* Calendar */}
        {isLoading ? (
          <div className="text-center py-12">Loading calendar...</div>
        ) : (
          <Card>
            <div className="p-4" style={{ height: "600px" }}>
              <BigCalendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={handleViewChange}
                date={currentDate}
                onNavigate={handleNavigate}
                eventPropGetter={eventStyleGetter}
                views={["day", "week", "month"]}
                components={{
                  event: ({ event }) => (
                    <div className="flex items-center gap-1">
                      {event.resource?.isRecurring && (
                        <Repeat className="h-3 w-3" />
                      )}
                      <span className="text-xs font-medium truncate">
                        {event.title}
                      </span>
                    </div>
                  ),
                }}
              />
            </div>
          </Card>
        )}

        {/* Legend */}
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              Priority Legend
            </h3>
            <div className="flex flex-wrap gap-4">
              {Object.entries(priorityColors).map(([priority, color]) => (
                <div key={priority} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-600">{priority}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};
