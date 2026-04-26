(() => {
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });

  // app.tsx
  var import_react6 = __require("react");
  var import_client = __require("react-dom/client");

  // utils/api.ts
  var API_BASE = "https://gotocare-original.jjioji.workers.dev";
  var authToken = "";
  async function apiFetch(endpoint, options) {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `JWT ${authToken}`;
    const url = `${API_BASE}${endpoint}`;
    const method = options?.method || "GET";
    const body = options?.body || "";
    if (window.tasklet?.runCommand) {
      let cmd = `curl -s -X ${method} "${url}" -H "Content-Type: application/json"`;
      if (authToken) cmd += ` -H "Authorization: JWT ${authToken}"`;
      if (body) cmd += ` -d '${typeof body === "string" ? body : JSON.stringify(body)}'`;
      const result = await window.tasklet.runCommand(cmd);
      try {
        return JSON.parse(result.log || "{}");
      } catch {
        return { error: result.log || "Unknown error" };
      }
    }
    const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
    return res.json();
  }
  async function login(email, password) {
    const data = await apiFetch("/api/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (data.token) authToken = data.token;
    return data;
  }
  async function fetchShifts(caregiverId) {
    return apiFetch(`/api/shifts?where[caregiver][equals]=${caregiverId}&sort=date&depth=1&limit=50`);
  }
  async function fetchTimesheets(caregiverId) {
    return apiFetch(`/api/timesheets?where[caregiver][equals]=${caregiverId}&sort=-date&depth=1&limit=50`);
  }
  async function clockIn(shiftId) {
    return apiFetch("/api/clock-in", {
      method: "POST",
      body: JSON.stringify({ shiftId })
    });
  }
  async function clockOut(timesheetId, hourlyRate) {
    return apiFetch("/api/clock-out", {
      method: "POST",
      body: JSON.stringify({ timesheetId, hourlyRate })
    });
  }
  async function updateProfile(caregiverId, data) {
    return apiFetch(`/api/caregivers/${caregiverId}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    });
  }
  function clearAuth() {
    authToken = "";
  }

  // components/LoginScreen.tsx
  var import_react = __require("react");
  var import_lucide_react = __require("lucide-react");
  var import_jsx_runtime = __require("react/jsx-runtime");
  var LoginScreen = ({ onLogin, error, loading }) => {
    const [email, setEmail] = (0, import_react.useState)("");
    const [password, setPassword] = (0, import_react.useState)("");
    const [showPassword, setShowPassword] = (0, import_react.useState)(false);
    const handleSubmit = (e) => {
      e.preventDefault();
      if (email && password) onLogin(email, password);
    };
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "min-h-screen flex flex-col bg-base-100", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "earnings-card px-6 pt-16 pb-12 flex flex-col items-center text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-4", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Heart, { size: 32, className: "text-white" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", { className: "text-2xl font-bold text-white mb-1", children: "GoToCare" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-white/80 text-sm", children: "Your caregiving career, in your pocket" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "flex-1 -mt-6 bg-base-100 rounded-t-3xl px-6 pt-8 pb-6", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "text-xl font-bold text-base-content mb-1", children: "Welcome back" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "text-base-content/60 text-sm mb-6", children: "Sign in to your caregiver account" }),
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "alert alert-error mb-4 text-sm py-2", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: error }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "text-sm font-medium text-base-content/80 mb-1 block", children: "Email" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "email",
                className: "input input-bordered w-full h-12 text-base",
                placeholder: "maria@example.com",
                value: email,
                onChange: (e) => setEmail(e.target.value),
                autoComplete: "email",
                required: true
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "text-sm font-medium text-base-content/80 mb-1 block", children: "Password" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "relative", children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  type: showPassword ? "text" : "password",
                  className: "input input-bordered w-full h-12 text-base pr-12",
                  placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
                  value: password,
                  onChange: (e) => setPassword(e.target.value),
                  autoComplete: "current-password",
                  required: true
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: "absolute right-3 top-1/2 -translate-y-1/2 p-1",
                  onClick: () => setShowPassword(!showPassword),
                  children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.EyeOff, { size: 20, className: "opacity-40" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.Eye, { size: 20, className: "opacity-40" })
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "submit",
              className: "btn btn-primary w-full h-12 text-base font-semibold gap-2",
              disabled: loading || !email || !password,
              children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "loading loading-spinner loading-sm" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                "Sign In ",
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_lucide_react.ArrowRight, { size: 18 })
              ] })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "text-center mt-8", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "text-sm text-base-content/50", children: [
          "New caregiver?",
          " ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "text-primary font-medium", children: "Join GoToCare" })
        ] }) })
      ] })
    ] });
  };

  // components/HomeTab.tsx
  var import_lucide_react2 = __require("lucide-react");
  var import_jsx_runtime2 = __require("react/jsx-runtime");
  var HomeTab = ({
    profile,
    shifts,
    timesheets,
    requests,
    loading,
    onNavigateToRequests,
    onNavigateToSchedule,
    onClockIn
  }) => {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const todayShifts = shifts.filter((s) => s.date === today || s.date?.startsWith(today));
    const activeTimesheets = timesheets.filter((t) => t.status === "clocked_in");
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const weekEarnings = timesheets.filter((t) => t.status === "approved" || t.status === "paid").reduce((sum, t) => sum + (t.totalPay || 0), 0);
    const weekHours = timesheets.filter((t) => t.hoursWorked).reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
    const greeting = () => {
      const hour = (/* @__PURE__ */ new Date()).getHours();
      if (hour < 12) return "Good morning";
      if (hour < 17) return "Good afternoon";
      return "Good evening";
    };
    if (loading) {
      return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "skeleton-shimmer h-8 w-48 rounded-lg" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "skeleton-shimmer h-32 rounded-2xl" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "skeleton-shimmer h-24 rounded-2xl" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "skeleton-shimmer h-24 rounded-2xl" })
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "p-4 space-y-5 pb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h1", { className: "text-xl font-bold text-base-content", children: [
            greeting(),
            ", ",
            profile?.firstName || "Caregiver",
            " \u{1F44B}"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1.5 mt-0.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "w-2 h-2 rounded-full bg-success pulse-dot" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xs text-base-content/60", children: "Available for work" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "text-sm font-bold text-primary", children: [
          profile?.firstName?.[0],
          profile?.lastName?.[0]
        ] }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "earnings-card rounded-2xl p-5 text-white", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-white/90 text-xs font-medium uppercase tracking-wide", children: "This Week" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-end justify-between mt-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-3xl font-bold", children: [
              "$",
              weekEarnings.toFixed(0)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-white/85 text-sm mt-0.5", children: [
              weekHours.toFixed(1),
              " hours worked"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-1 bg-white/25 rounded-full px-2.5 py-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.TrendingUp, { size: 14 }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "text-xs font-medium", children: "+12%" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "mt-3 bg-white/25 rounded-full h-1.5", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "bg-white rounded-full h-1.5", style: { width: `${Math.min(weekHours / 40 * 100, 100)}%` } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-white/85 text-[10px] mt-1", children: [
          weekHours.toFixed(0),
          "/40 hours goal"
        ] })
      ] }),
      activeTimesheets.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-success/10 border border-success/20 rounded-2xl p-4 flex items-center gap-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-10 h-10 rounded-full bg-success/20 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Zap, { size: 20, className: "text-success" }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex-1", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "font-semibold text-sm text-base-content", children: "Shift in Progress" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-xs text-base-content/60", children: [
            activeTimesheets.length,
            " active \u2014 tap to view"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.ChevronRight, { size: 18, className: "opacity-40" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "font-bold text-base text-base-content", children: "Today's Schedule" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { onClick: onNavigateToSchedule, className: "text-xs text-primary font-medium", children: "View All" })
        ] }),
        todayShifts.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-base-200 rounded-2xl p-6 text-center", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Calendar, { size: 32, className: "mx-auto opacity-30 mb-2" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-sm text-base-content/60", children: "No shifts scheduled today" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-base-content/40 mt-1", children: "Check requests for new opportunities" })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "space-y-2.5", children: todayShifts.map((shift) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "bg-base-200 rounded-2xl p-4 press-card", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mt-0.5", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Clock, { size: 18, className: "text-primary" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "font-semibold text-sm text-base-content", children: typeof shift.client === "object" ? `${shift.client.firstName || ""} ${shift.client.lastName || ""}`.trim() : `Client #${shift.client}` }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-xs text-base-content/60 mt-0.5", children: [
                shift.startTime,
                " \u2014 ",
                shift.endTime
              ] }),
              shift.careType && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "inline-block mt-1.5 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full", children: shift.careType })
            ] })
          ] }),
          shift.status === "scheduled" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
            "button",
            {
              onClick: () => onClockIn(shift.id),
              className: "btn btn-primary btn-sm text-xs",
              children: "Check In"
            }
          ),
          shift.status === "in_progress" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "badge badge-success badge-sm", children: "In Progress" })
        ] }) }, shift.id)) })
      ] }),
      pendingRequests.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center justify-between mb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("h2", { className: "font-bold text-base text-base-content", children: [
            "New Requests",
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "ml-2 badge badge-primary badge-sm", children: pendingRequests.length })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { onClick: onNavigateToRequests, className: "text-xs text-primary font-medium", children: "View All" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "bg-base-200 rounded-2xl p-4 press-card", onClick: onNavigateToRequests, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Bell, { size: 18, className: "text-warning" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "flex-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "font-semibold text-sm text-base-content", children: [
              pendingRequests.length,
              " care request",
              pendingRequests.length > 1 ? "s" : "",
              " waiting"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("p", { className: "text-xs text-base-content/60 mt-0.5", children: [
              "Up to $",
              Math.max(...pendingRequests.map((r) => r.hourlyRate || 0)),
              "/hr \xB7 Tap to respond"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.ChevronRight, { size: 18, className: "opacity-40" })
        ] }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { className: "font-bold text-base text-base-content mb-3", children: "Your Stats" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "grid grid-cols-3 gap-2.5", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-base-200 rounded-2xl p-3 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Star, { size: 18, className: "mx-auto text-warning mb-1" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-lg font-bold text-base-content", children: profile?.rating || "4.9" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[10px] text-base-content/50", children: "Rating" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-base-200 rounded-2xl p-3 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.Briefcase, { size: 18, className: "mx-auto text-primary mb-1" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-lg font-bold text-base-content", children: profile?.totalJobs || shifts.length }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[10px] text-base-content/50", children: "Jobs Done" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "bg-base-200 rounded-2xl p-3 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_lucide_react2.TrendingUp, { size: 18, className: "mx-auto text-success mb-1" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-lg font-bold text-base-content", children: "96%" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-[10px] text-base-content/50", children: "Response" })
          ] })
        ] })
      ] })
    ] });
  };

  // components/ScheduleTab.tsx
  var import_react2 = __require("react");
  var import_lucide_react3 = __require("lucide-react");
  var import_jsx_runtime3 = __require("react/jsx-runtime");
  var ScheduleTab = ({ shifts, loading, onClockIn }) => {
    const [viewMode, setViewMode] = (0, import_react2.useState)("upcoming");
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const sortedShifts = [...shifts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const upcomingShifts = sortedShifts.filter((s) => new Date(s.date) >= today);
    const pastShifts = sortedShifts.filter((s) => new Date(s.date) < today).reverse();
    const displayShifts = viewMode === "upcoming" ? upcomingShifts : pastShifts;
    const grouped = {};
    displayShifts.forEach((s) => {
      const dateKey = s.date?.split("T")[0] || s.date;
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(s);
    });
    const formatDate = (dateStr) => {
      const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
      const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const tomorrow = /* @__PURE__ */ new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      if (dateStr === todayStr) return "Today";
      if (dateStr === tomorrowStr) return "Tomorrow";
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    };
    const statusBadge = (status) => {
      const map = {
        scheduled: "badge-info",
        in_progress: "badge-success",
        completed: "badge-ghost",
        cancelled: "badge-error"
      };
      return map[status] || "badge-ghost";
    };
    if (loading) {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "p-4 space-y-4", children: [1, 2, 3].map((i) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "skeleton-shimmer h-24 rounded-2xl" }, i)) });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "pb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "px-4 pt-4 pb-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h1", { className: "text-xl font-bold text-base-content", children: "Schedule" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex gap-2 mt-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "button",
            {
              className: `btn btn-sm rounded-full ${viewMode === "upcoming" ? "btn-primary" : "btn-ghost"}`,
              onClick: () => setViewMode("upcoming"),
              children: [
                "Upcoming (",
                upcomingShifts.length,
                ")"
              ]
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "button",
            {
              className: `btn btn-sm rounded-full ${viewMode === "past" ? "btn-primary" : "btn-ghost"}`,
              onClick: () => setViewMode("past"),
              children: [
                "Past (",
                pastShifts.length,
                ")"
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "px-4 space-y-5", children: Object.keys(grouped).length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "text-center py-12", children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.Calendar, { size: 40, className: "mx-auto opacity-20 mb-3" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "text-base-content/60 text-sm", children: [
          "No ",
          viewMode,
          " shifts"
        ] })
      ] }) : Object.entries(grouped).map(([date, dateShifts]) => /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "text-xs font-semibold text-base-content/50 uppercase tracking-wide mb-2", children: formatDate(date) }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "space-y-2", children: dateShifts.map((shift) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "bg-base-200 rounded-2xl p-4 press-card", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex items-start justify-between", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col items-center", children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-sm font-bold text-base-content", children: shift.startTime || "9:00" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "w-px h-4 bg-base-300 my-0.5" }),
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "text-xs text-base-content/50", children: shift.endTime || "13:00" })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "font-semibold text-sm text-base-content", children: typeof shift.client === "object" ? `${shift.client?.firstName || ""} ${shift.client?.lastName || ""}`.trim() : `Client #${shift.client}` }),
              shift.careType && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "inline-block mt-1 text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full", children: shift.careType }),
              shift.address && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("p", { className: "text-xs text-base-content/50 mt-1 flex items-center gap-1", children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(import_lucide_react3.MapPin, { size: 10 }),
                " ",
                shift.address
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "flex flex-col items-end gap-1.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: `badge badge-sm ${statusBadge(shift.status)}`, children: shift.status?.replace("_", " ") }),
            shift.status === "scheduled" && viewMode === "upcoming" && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { onClick: () => onClockIn(shift.id), className: "btn btn-primary btn-xs", children: "Check In" })
          ] })
        ] }) }, shift.id)) })
      ] }, date)) })
    ] });
  };

  // components/RequestsTab.tsx
  var import_react3 = __require("react");
  var import_lucide_react4 = __require("lucide-react");
  var import_jsx_runtime4 = __require("react/jsx-runtime");
  var RequestsTab = ({ requests, loading, onAccept, onDecline }) => {
    const [currentIndex, setCurrentIndex] = (0, import_react3.useState)(0);
    const [swiping, setSwiping] = (0, import_react3.useState)(false);
    const [swipeDir, setSwipeDir] = (0, import_react3.useState)(0);
    const [history, setHistory] = (0, import_react3.useState)([]);
    const startX = (0, import_react3.useRef)(0);
    const startY = (0, import_react3.useRef)(0);
    const pendingRequests = requests.filter((r) => r.status === "pending");
    const currentRequest = pendingRequests[currentIndex];
    const triggerHaptic = (pattern) => {
      if (navigator.vibrate) {
        const patterns = {
          light: 20,
          medium: 50,
          heavy: 100
        };
        navigator.vibrate(patterns[pattern]);
      }
    };
    const urgencyBadge = (urgency) => {
      if (urgency === "today") return { text: "Needs Today", class: "bg-error/10 text-error" };
      if (urgency === "this_week") return { text: "This Week", class: "bg-warning/10 text-warning" };
      return { text: "Flexible", class: "bg-info/10 text-info" };
    };
    const handleSwipeStart = (e) => {
      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
    };
    const handleSwipeMove = (e) => {
      if (!currentRequest) return;
      const currentX = e.touches[0].clientX;
      const diff = currentX - startX.current;
      const verticalDiff = Math.abs(e.touches[0].clientY - startY.current);
      if (Math.abs(diff) > verticalDiff && Math.abs(diff) > 10) {
        setSwiping(true);
        setSwipeDir(diff);
      }
    };
    const handleSwipeEnd = () => {
      const threshold = 80;
      if (Math.abs(swipeDir) > threshold) {
        triggerHaptic("heavy");
        const action = swipeDir > 0 ? "accept" : "decline";
        setHistory([...history, { id: currentRequest.id, action }]);
        if (action === "accept") {
          onAccept(currentRequest.id);
        } else {
          onDecline(currentRequest.id);
        }
        setTimeout(() => {
          setCurrentIndex((prev) => prev + 1);
          setSwiping(false);
          setSwipeDir(0);
        }, 300);
      } else {
        setSwiping(false);
        setSwipeDir(0);
      }
    };
    const handleUndo = () => {
      if (history.length === 0) return;
      const lastAction = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentIndex((prev) => prev - 1);
      triggerHaptic("light");
    };
    const handleQuickAction = (action) => {
      triggerHaptic("medium");
      setHistory([...history, { id: currentRequest.id, action }]);
      if (action === "accept") {
        onAccept(currentRequest.id);
      } else {
        onDecline(currentRequest.id);
      }
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 300);
    };
    if (loading) {
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex flex-col h-full items-center justify-center p-4", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "skeleton-shimmer w-full h-96 rounded-3xl" }) });
    }
    if (pendingRequests.length === 0) {
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col h-full items-center justify-center p-6 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Heart, { size: 56, className: "mx-auto opacity-20 mb-4" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "text-lg font-bold text-base-content", children: "No Care Requests Yet" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-base-content/60 mt-2", children: "Check back soon!" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-base-content/40 mt-1", children: "New requests will appear as clients find you" })
      ] });
    }
    if (currentIndex >= pendingRequests.length) {
      return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col h-full items-center justify-center p-6 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Check, { size: 56, className: "mx-auto text-success mb-4" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { className: "text-lg font-bold text-base-content", children: "All Reviewed!" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-base-content/60 mt-2", children: "You've reviewed all pending requests" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            onClick: () => {
              setCurrentIndex(0);
              setHistory([]);
            },
            className: "btn btn-primary btn-sm mt-4",
            children: "Start Over"
          }
        )
      ] });
    }
    const ub = urgencyBadge(currentRequest.urgency);
    const cardStyle = {
      transform: swiping ? `translateX(${swipeDir * 0.3}px) rotate(${swipeDir * 0.05}deg)` : "translateX(0) rotate(0)",
      opacity: swiping ? 1 - Math.abs(swipeDir) / 300 : 1,
      transition: swiping ? "none" : "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)"
    };
    return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex flex-col h-full pb-20", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "px-4 pt-4 pb-2 flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h1", { className: "text-xl font-bold text-base-content", children: "Care Requests" }),
          /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "text-sm text-base-content/60 mt-0.5", children: [
            currentIndex + 1,
            " of ",
            pendingRequests.length
          ] })
        ] }),
        history.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "button",
          {
            onClick: handleUndo,
            className: "btn btn-ghost btn-sm",
            title: "Undo last action",
            children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.RotateCcw, { size: 16 })
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "flex-1 px-4 mt-4 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "div",
        {
          className: "w-full max-w-sm cursor-grab active:cursor-grabbing",
          onTouchStart: handleSwipeStart,
          onTouchMove: handleSwipeMove,
          onTouchEnd: handleSwipeEnd,
          style: cardStyle,
          children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "bg-base-200 rounded-3xl overflow-hidden shadow-xl", children: [
            currentRequest.matchScore && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "earnings-card px-4 py-3 flex items-center justify-between", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "text-white/90 text-sm font-medium", children: "Perfect Match" }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { className: "text-white font-bold text-lg", children: [
                currentRequest.matchScore,
                "%"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "p-5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-start justify-between mb-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex-1", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "font-bold text-xl text-base-content", children: currentRequest.clientName }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-sm text-base-content/60 mt-0.5", children: currentRequest.careType })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: `text-xs font-semibold px-3 py-1.5 rounded-full ${ub.class}`, children: ub.text })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "space-y-3 mb-4", children: [
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3 text-base text-base-content/80", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "bg-primary/10 p-2.5 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.MapPin, { size: 18, className: "text-primary" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-base-content/60", children: "Location" }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "font-medium", children: currentRequest.location })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3 text-base text-base-content/80", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "bg-primary/10 p-2.5 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Clock, { size: 18, className: "text-primary" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-base-content/60", children: "Schedule" }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "font-medium", children: currentRequest.schedule })
                  ] })
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3 text-base text-base-content/80", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "bg-success/10 p-2.5 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.DollarSign, { size: 18, className: "text-success" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-base-content/60", children: "Hourly Rate" }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "font-medium text-lg", children: [
                      "$",
                      currentRequest.hourlyRate,
                      "/hr"
                    ] })
                  ] })
                ] }),
                currentRequest.weeklyEarnings && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex items-center gap-3 text-base text-base-content/80", children: [
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "bg-warning/10 p-2.5 rounded-lg", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Star, { size: 18, className: "text-warning" }) }),
                  /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { className: "text-xs text-base-content/60", children: "Potential Earnings" }),
                    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "font-medium", children: [
                      "$",
                      currentRequest.weeklyEarnings,
                      "/week"
                    ] })
                  ] })
                ] })
              ] }),
              currentRequest.description && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "bg-base-300/30 rounded-xl p-3 mb-4", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("p", { className: "text-sm text-base-content/80 leading-relaxed", children: [
                '"',
                currentRequest.description,
                '"'
              ] }) }),
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "text-center text-xs text-base-content/40 mb-4", children: "\u2190 Swipe \u2192 or use buttons below" })
            ] })
          ] })
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "fixed bottom-20 left-0 right-0 px-4 pb-4 bg-gradient-to-t from-base-100 to-transparent pt-6", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "flex gap-3 max-w-sm mx-auto", children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "button",
          {
            onClick: () => handleQuickAction("decline"),
            className: "btn btn-outline btn-lg flex-1 rounded-2xl text-lg",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.X, { size: 20 }),
              " Pass"
            ]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)(
          "button",
          {
            onClick: () => handleQuickAction("accept"),
            className: "btn btn-primary btn-lg flex-1 rounded-2xl text-lg",
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_lucide_react4.Check, { size: 20 }),
              " Accept"
            ]
          }
        )
      ] }) })
    ] });
  };

  // components/EarningsTab.tsx
  var import_react4 = __require("react");
  var import_lucide_react5 = __require("lucide-react");
  var import_jsx_runtime5 = __require("react/jsx-runtime");
  var EarningsTab = ({ timesheets, loading }) => {
    const [period, setPeriod] = (0, import_react4.useState)("week");
    const now = /* @__PURE__ */ new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1e3);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1e3);
    const filterByPeriod = (ts) => {
      if (period === "all") return ts;
      const cutoff = period === "week" ? weekAgo : monthAgo;
      return ts.filter((t) => new Date(t.date) >= cutoff);
    };
    const relevantTimesheets = filterByPeriod(timesheets);
    const totalEarnings = relevantTimesheets.reduce((sum, t) => sum + (t.totalPay || 0), 0);
    const totalHours = relevantTimesheets.reduce((sum, t) => sum + (t.hoursWorked || 0), 0);
    const paidAmount = relevantTimesheets.filter((t) => t.status === "paid").reduce((sum, t) => sum + (t.totalPay || 0), 0);
    const pendingAmount = totalEarnings - paidAmount;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });
    const dailyEarnings = last7Days.map((date) => {
      const dayTs = timesheets.filter((t) => t.date?.startsWith(date));
      return {
        date,
        amount: dayTs.reduce((sum, t) => sum + (t.totalPay || 0), 0),
        day: (/* @__PURE__ */ new Date(date + "T00:00:00")).toLocaleDateString("en-US", { weekday: "short" })
      };
    });
    const maxDaily = Math.max(...dailyEarnings.map((d) => d.amount), 1);
    if (loading) {
      return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "p-4 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "skeleton-shimmer h-40 rounded-2xl" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "skeleton-shimmer h-48 rounded-2xl" })
      ] });
    }
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "pb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "px-4 pt-4 pb-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h1", { className: "text-xl font-bold text-base-content", children: "Earnings" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "px-4 flex gap-2 mb-4", children: [
        { key: "week", label: "This Week" },
        { key: "month", label: "This Month" },
        { key: "all", label: "All Time" }
      ].map((p) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          className: `btn btn-sm rounded-full ${period === p.key ? "btn-primary" : "btn-ghost"}`,
          onClick: () => setPeriod(p.key),
          children: p.label
        },
        p.key
      )) }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "px-4 space-y-4", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "earnings-card rounded-2xl p-5 text-white", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-white/90 text-xs font-medium uppercase tracking-wide", children: "Total Earnings" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "text-4xl font-bold mt-1", children: [
            "$",
            totalEarnings.toFixed(2)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex gap-4 mt-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.Clock, { size: 12, className: "text-white/85" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "text-sm text-white/90", children: [
                totalHours.toFixed(1),
                " hrs"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-1.5", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.DollarSign, { size: 12, className: "text-white/85" }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "text-sm text-white/90", children: [
                "$",
                totalHours > 0 ? (totalEarnings / totalHours).toFixed(0) : 0,
                "/hr avg"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "grid grid-cols-2 gap-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex items-center gap-2 mb-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.CreditCard, { size: 16, className: "text-success" }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "text-lg font-bold text-base-content", children: [
              "$",
              paidAmount.toFixed(0)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-[10px] text-base-content/70 uppercase tracking-wide", children: "Paid" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex items-center gap-2 mb-2", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.Clock, { size: 16, className: "text-warning" }) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "text-lg font-bold text-base-content", children: [
              "$",
              pendingAmount.toFixed(0)
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-[10px] text-base-content/70 uppercase tracking-wide", children: "Pending" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-sm font-semibold text-base-content mb-4", children: "Last 7 Days" }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "flex items-end gap-2 h-28", children: dailyEarnings.map((d, i) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex-1 flex flex-col items-center gap-1", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-[9px] text-base-content/70 font-medium", children: d.amount > 0 ? `$${d.amount.toFixed(0)}` : "" }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "div",
              {
                className: "w-full rounded-t-lg bg-primary/85 min-h-[4px] transition-all",
                style: { height: `${d.amount / maxDaily * 80}px` }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "text-[10px] text-base-content/60", children: d.day })
          ] }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-sm font-semibold text-base-content mb-3", children: "Recent Activity" }),
          relevantTimesheets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-sm text-base-content/65 text-center py-6", children: "No activity in this period" }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "space-y-2", children: relevantTimesheets.slice(0, 10).map((ts) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "bg-base-200 rounded-xl p-3 flex items-center justify-between", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: `w-8 h-8 rounded-full flex items-center justify-center ${ts.status === "paid" ? "bg-success/10" : "bg-base-300"}`, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(import_lucide_react5.DollarSign, { size: 14, className: ts.status === "paid" ? "text-success" : "opacity-60" }) }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "text-sm font-medium text-base-content", children: [
                  ts.hoursWorked?.toFixed(1) || "0",
                  " hours"
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { className: "text-[10px] text-base-content/65", children: new Date(ts.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) })
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "text-right", children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("p", { className: "text-sm font-bold text-base-content", children: [
                "$",
                (ts.totalPay || 0).toFixed(2)
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: `text-[10px] ${ts.status === "paid" ? "text-success" : "text-base-content/60"}`, children: ts.status })
            ] })
          ] }, ts.id)) })
        ] })
      ] })
    ] });
  };

  // components/ProfileTab.tsx
  var import_react5 = __require("react");
  var import_lucide_react6 = __require("lucide-react");
  var import_jsx_runtime6 = __require("react/jsx-runtime");
  var ProfileTab = ({ profile, onLogout, onUpdateProfile }) => {
    const [isAvailable, setIsAvailable] = (0, import_react5.useState)(profile?.status === "active");
    const [editing, setEditing] = (0, import_react5.useState)(false);
    const [editBio, setEditBio] = (0, import_react5.useState)(profile?.bio || "");
    const [editRate, setEditRate] = (0, import_react5.useState)(String(profile?.hourlyRate || ""));
    const handleToggleAvailability = () => {
      const newStatus = !isAvailable;
      setIsAvailable(newStatus);
      onUpdateProfile({ status: newStatus ? "active" : "inactive" });
    };
    const handleSaveProfile = () => {
      onUpdateProfile({
        bio: editBio,
        hourlyRate: parseFloat(editRate) || profile?.hourlyRate
      });
      setEditing(false);
    };
    if (!profile) return null;
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "pb-4", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "earnings-card px-4 pt-6 pb-8 text-center", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "relative inline-block mb-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center avatar-ring", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-2xl font-bold text-white", children: [
            profile.firstName?.[0],
            profile.lastName?.[0]
          ] }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { className: "absolute bottom-0 right-0 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Camera, { size: 14, className: "text-primary" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("h2", { className: "text-xl font-bold text-white", children: [
          profile.firstName,
          " ",
          profile.lastName
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-white/90 text-sm mt-0.5", children: "Professional Caregiver" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-center gap-3 mt-2", children: [
          profile.rating && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Star, { size: 12, className: "text-yellow-300" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-medium text-white", children: profile.rating })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-1 bg-white/20 rounded-full px-2.5 py-0.5", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Shield, { size: 12, className: "text-green-300" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-xs font-medium text-white", children: "Verified" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "-mt-4 mx-4 bg-base-100 rounded-2xl p-4 shadow-sm border border-base-200", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "font-semibold text-sm text-base-content", children: "Available for Work" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-xs text-base-content/70", children: "Clients can find and book you" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          "input",
          {
            type: "checkbox",
            className: "toggle toggle-primary toggle-sm",
            checked: isAvailable,
            onChange: handleToggleAvailability
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "px-4 mt-4 space-y-3", children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "grid grid-cols-3 gap-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-xl p-3 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.DollarSign, { size: 16, className: "mx-auto text-primary mb-1" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("p", { className: "text-base font-bold text-base-content", children: [
              "$",
              profile.hourlyRate || 25
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] text-base-content/50", children: "Per Hour" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-xl p-3 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Award, { size: 16, className: "mx-auto text-warning mb-1" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-base font-bold text-base-content", children: profile.totalJobs || 0 }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] text-base-content/50", children: "Jobs Done" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-xl p-3 text-center", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Clock, { size: 16, className: "mx-auto text-success mb-1" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-base font-bold text-base-content", children: profile.totalReviews || 0 }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-[10px] text-base-content/50", children: "Reviews" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "font-semibold text-sm text-base-content", children: "About" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { onClick: () => setEditing(!editing), className: "btn btn-ghost btn-xs gap-1", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Edit3, { size: 12 }),
              " Edit"
            ] })
          ] }),
          editing ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "space-y-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "textarea",
              {
                className: "textarea textarea-bordered w-full text-sm",
                rows: 3,
                value: editBio,
                onChange: (e) => setEditBio(e.target.value),
                placeholder: "Tell clients about yourself..."
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("label", { className: "text-xs text-base-content/60 mb-1 block", children: "Hourly Rate ($)" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                "input",
                {
                  type: "number",
                  className: "input input-bordered input-sm w-full",
                  value: editRate,
                  onChange: (e) => setEditRate(e.target.value)
                }
              )
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { onClick: () => setEditing(false), className: "btn btn-ghost btn-sm flex-1", children: "Cancel" }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { onClick: handleSaveProfile, className: "btn btn-primary btn-sm flex-1", children: "Save" })
            ] })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "text-sm text-base-content/70 leading-relaxed", children: profile.bio || "No bio yet. Tap edit to tell clients about your experience and care philosophy." })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4 space-y-3", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "font-semibold text-sm text-base-content", children: "Contact" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Mail, { size: 14, className: "text-primary" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm text-base-content/70", children: profile.email })
          ] }),
          profile.phone && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Phone, { size: 14, className: "text-primary" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "text-sm text-base-content/70", children: profile.phone })
          ] }),
          profile.location && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-3", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.MapPin, { size: 14, className: "text-primary" }) }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "text-sm text-base-content/70", children: [
              profile.location.city,
              ", ",
              profile.location.state
            ] })
          ] })
        ] }),
        profile.skills && profile.skills.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "font-semibold text-sm text-base-content mb-2", children: "Skills & Specializations" }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex flex-wrap gap-1.5", children: profile.skills.map((skill, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "badge badge-sm bg-primary/10 text-primary border-0 py-2.5", children: skill }, i)) })
        ] }),
        profile.languages && profile.languages.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "bg-base-200 rounded-2xl p-4", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "flex items-center gap-2 mb-2", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.Globe, { size: 14, className: "text-primary" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "font-semibold text-sm text-base-content", children: "Languages" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "flex flex-wrap gap-1.5", children: profile.languages.map((lang, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "badge badge-sm badge-ghost py-2.5", children: lang }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "bg-base-200 rounded-2xl overflow-hidden", children: [
          { icon: import_lucide_react6.Shield, label: "Verification & Documents", color: "text-success" },
          { icon: import_lucide_react6.Settings, label: "Settings", color: "text-base-content/60" }
        ].map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { className: "w-full flex items-center gap-3 p-4 hover:bg-base-300 transition-colors border-b border-base-300 last:border-0", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(item.icon, { size: 18, className: item.color }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "flex-1 text-left text-sm text-base-content", children: item.label }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.ChevronRight, { size: 16, className: "opacity-30" })
        ] }, i)) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { onClick: onLogout, className: "btn btn-ghost w-full text-error gap-2 mt-2", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(import_lucide_react6.LogOut, { size: 18 }),
          " Sign Out"
        ] })
      ] })
    ] });
  };

  // components/BottomNav.tsx
  var import_lucide_react7 = __require("lucide-react");
  var import_jsx_runtime7 = __require("react/jsx-runtime");
  var BottomNav = ({ activeTab, onTabChange, requestCount = 0 }) => {
    const tabs = [
      { id: "home", label: "Home", icon: import_lucide_react7.Home },
      { id: "schedule", label: "Schedule", icon: import_lucide_react7.Calendar },
      { id: "requests", label: "Requests", icon: import_lucide_react7.Bell },
      { id: "earnings", label: "Earnings", icon: import_lucide_react7.DollarSign },
      { id: "profile", label: "Profile", icon: import_lucide_react7.User }
    ];
    return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-300 safe-bottom z-50", children: /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "flex items-center justify-around h-16 max-w-lg mx-auto px-2", children: tabs.map((tab) => {
      const Icon = tab.icon;
      const isActive = activeTab === tab.id;
      return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)(
        "button",
        {
          onClick: () => onTabChange(tab.id),
          className: `bottom-nav-item flex flex-col items-center justify-center gap-0.5 w-14 h-14 rounded-xl relative ${isActive ? "active" : "text-base-content/40"}`,
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className: "relative", children: [
              /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(Icon, { size: 22, strokeWidth: isActive ? 2.5 : 1.5 }),
              tab.id === "requests" && requestCount > 0 && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: "absolute -top-1.5 -right-2.5 bg-error text-error-content text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center", children: requestCount > 9 ? "9+" : requestCount })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { className: `text-[10px] font-medium ${isActive ? "" : "text-base-content/40"}`, children: tab.label }),
            isActive && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { className: "absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full" })
          ]
        },
        tab.id
      );
    }) }) });
  };

  // app.tsx
  var import_jsx_runtime8 = __require("react/jsx-runtime");
  var DEMO_REQUESTS = [
    {
      id: 1,
      clientName: "Sarah Mitchell",
      careType: "In-Home Companion Care",
      description: "Looking for a compassionate caregiver for my 82-year-old mother who has early-stage dementia. Needs help with meals, light activities, and companionship.",
      location: "Buckhead, Atlanta",
      distance: "2.3 mi",
      schedule: "Mon-Fri, 9am-1pm",
      hourlyRate: 24,
      weeklyHours: 20,
      weeklyEarnings: 480,
      matchScore: 95,
      postedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      urgency: "this_week"
    },
    {
      id: 2,
      clientName: "Robert Chen",
      careType: "Post-Surgery Recovery",
      description: "Need assistance after hip replacement surgery. Help with mobility, medication reminders, and light housekeeping.",
      location: "Midtown, Atlanta",
      distance: "4.1 mi",
      schedule: "Daily, 2pm-6pm",
      hourlyRate: 28,
      weeklyHours: 28,
      weeklyEarnings: 784,
      matchScore: 88,
      postedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      urgency: "today"
    },
    {
      id: 3,
      clientName: "Emily Torres",
      careType: "Elderly Care",
      description: "Seeking overnight caregiver for my father. Needs monitoring and occasional assistance.",
      location: "Decatur, GA",
      distance: "6.5 mi",
      schedule: "Weekends, 8pm-8am",
      hourlyRate: 22,
      weeklyHours: 24,
      weeklyEarnings: 528,
      matchScore: 78,
      postedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending",
      urgency: "flexible"
    }
  ];
  var App = () => {
    const [loggedIn, setLoggedIn] = (0, import_react6.useState)(false);
    const [loginError, setLoginError] = (0, import_react6.useState)("");
    const [loginLoading, setLoginLoading] = (0, import_react6.useState)(false);
    const [activeTab, setActiveTab] = (0, import_react6.useState)("home");
    const [profile, setProfile] = (0, import_react6.useState)(null);
    const [shifts, setShifts] = (0, import_react6.useState)([]);
    const [timesheets, setTimesheets] = (0, import_react6.useState)([]);
    const [requests, setRequests] = (0, import_react6.useState)(DEMO_REQUESTS);
    const [loading, setLoading] = (0, import_react6.useState)(false);
    const loadData = (0, import_react6.useCallback)(async (caregiverId) => {
      setLoading(true);
      try {
        const [shiftRes, tsRes] = await Promise.all([
          fetchShifts(caregiverId),
          fetchTimesheets(caregiverId)
        ]);
        if (shiftRes?.docs) setShifts(shiftRes.docs);
        if (tsRes?.docs) setTimesheets(tsRes.docs);
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    }, []);
    const handleLogin = async (email, password) => {
      setLoginError("");
      setLoginLoading(true);
      try {
        const result = await login(email, password);
        if (result.token && result.user) {
          const user = result.user;
          const cgProfile = {
            id: user.id,
            name: user.name || email.split("@")[0],
            email: user.email || email,
            phone: user.phone || "",
            status: "active",
            hourlyRate: 25,
            specializations: ["Companion Care", "Elderly Care"],
            languages: ["English"],
            availability: "available",
            rating: 4.8,
            completedShifts: 47,
            agency: user.agency
          };
          setProfile(cgProfile);
          setLoggedIn(true);
          if (!window.tasklet?.runCommand) {
            await loadData(cgProfile.id);
          }
        } else {
          setLoginError(result.errors?.[0]?.message || "Invalid email or password");
        }
      } catch (e) {
        setLoginError("Connection error. Please try again.");
      } finally {
        setLoginLoading(false);
      }
    };
    const handleLogout = () => {
      clearAuth();
      setLoggedIn(false);
      setProfile(null);
      setShifts([]);
      setTimesheets([]);
      setActiveTab("home");
    };
    const handleClockIn = async (shiftId) => {
      try {
        await clockIn(shiftId);
        if (profile) await loadData(profile.id);
      } catch (e) {
        console.error("Clock in failed:", e);
      }
    };
    const handleClockOut = async (timesheetId) => {
      try {
        await clockOut(timesheetId, profile?.hourlyRate || 25);
        if (profile) await loadData(profile.id);
      } catch (e) {
        console.error("Clock out failed:", e);
      }
    };
    const handleAcceptRequest = (requestId) => {
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "accepted" } : r));
    };
    const handleDeclineRequest = (requestId) => {
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status: "declined" } : r));
    };
    const handleUpdateProfile = async (data) => {
      if (!profile) return;
      try {
        await updateProfile(profile.id, data);
        setProfile((prev) => prev ? { ...prev, ...data } : prev);
      } catch (e) {
        console.error("Profile update failed:", e);
      }
    };
    if (!loggedIn) {
      return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(LoginScreen, { onLogin: handleLogin, error: loginError, loading: loginLoading });
    }
    const pendingRequestCount = requests.filter((r) => r.status === "pending").length;
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "min-h-screen bg-base-100 flex flex-col", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { className: "flex-1 overflow-y-auto pb-20 no-scrollbar", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "tab-content max-w-lg mx-auto", children: [
        activeTab === "home" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          HomeTab,
          {
            profile,
            shifts,
            timesheets,
            requests,
            loading,
            onNavigateToRequests: () => setActiveTab("requests"),
            onNavigateToSchedule: () => setActiveTab("schedule"),
            onClockIn: handleClockIn
          }
        ),
        activeTab === "schedule" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ScheduleTab, { shifts, loading, onClockIn: handleClockIn }),
        activeTab === "requests" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          RequestsTab,
          {
            requests,
            loading,
            onAccept: handleAcceptRequest,
            onDecline: handleDeclineRequest
          }
        ),
        activeTab === "earnings" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(EarningsTab, { timesheets, loading }),
        activeTab === "profile" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(ProfileTab, { profile, onLogout: handleLogout, onUpdateProfile: handleUpdateProfile })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        BottomNav,
        {
          activeTab,
          onTabChange: setActiveTab,
          requestCount: pendingRequestCount
        }
      )
    ] });
  };
  (0, import_client.createRoot)(document.getElementById("root")).render(/* @__PURE__ */ (0, import_jsx_runtime8.jsx)(App, {}));
})();
