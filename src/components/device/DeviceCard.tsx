import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    RefreshCw, Send, User, AppWindow, Grid2x2, ListChecks, ScrollText
} from "lucide-react";
import { fmtHMS, fmtLocal, fmtAgo } from "../../utils/format";
import DeviceAssignModal from "./DeviceAssignModal";
import DeviceCommandModal from "./DeviceCommandModal";
import DeviceHistoryModal from "./DeviceHistoryModal";
import DeviceLogsModal from "./DeviceLogsModal";
import DeviceAppsModal from "./DeviceAppsModal";
import DeviceTitlesModal from "./DeviceTitlesModal";
import {
    RadialBarChart, RadialBar, PolarAngleAxis, ResponsiveContainer,
} from "recharts";

type CommandSummary = {
    lastPending?: any | null;
    lastAck?: any | null;
    totals?: { pending?: number; acknowledged?: number; completed?: number } | null;
};

function StatusDot({ online }: { online: boolean }) {
    return (
        <span
            className={`inline-block h-2.5 w-2.5 rounded-full ring-2 ring-white ${online ? "bg-emerald-500" : "bg-rose-500"
                }`}
            aria-label={online ? "online" : "offline"}
            title={online ? "online" : "offline"}
        />
    );
}

function MiniRadial({ percent, good }: { percent: number; good: boolean }) {
    const val = Math.min(100, Math.max(0, Math.round(percent)));
    const data = useMemo(() => [{ name: "active", value: val }], [val]);
    const ringFill = good ? "#34d399" /* emerald-400 */ : "#f87171" /* rose-400 */;

    return (
        <div className="relative w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    data={data}
                    innerRadius="78%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                    <RadialBar
                        background
                        dataKey="value"
                        cornerRadius={10}
                        isAnimationActive={false}
                        fill={ringFill}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-slate-800">
                {val}%
            </div>
        </div>
    );
}

function StatPill({
    label,
    value,
    tone = "slate",
    title,
}: {
    label: string;
    value: number | string;
    tone?: "slate" | "amber" | "emerald" | "indigo";
    title?: string;
}) {
    const toneMap: Record<string, string> = {
        slate: "bg-slate-50 text-slate-700 ring-1 ring-slate-200",
        amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
        emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
        indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    };
    return (
        <div
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${toneMap[tone]} whitespace-nowrap`}
            title={title || `${label}: ${value}`}
        >
            <span className="opacity-70 mr-1">{label}</span>
            <span className="font-semibold">{value}</span>
        </div>
    );
}

export default function DeviceCard({
    device,
    onToast,
    refetchDevices,
    summary,
    summariesLoading,
}: {
    device: any;
    onToast: (t: { tone: "success" | "error"; title: string; desc?: string }) => void;
    refetchDevices: () => void;
    summary?: CommandSummary;
    summariesLoading?: boolean;
}) {
    const qc = useQueryClient();

    const [openAssign, setOpenAssign] = useState(false);
    const [openCmd, setOpenCmd] = useState(false);
    const [openHistory, setOpenHistory] = useState(false);
    const [openLogs, setOpenLogs] = useState(false);
    const [openApps, setOpenApps] = useState(false);
    const [openTitles, setOpenTitles] = useState(false);

    const lastSeen =
        device.lastSeen ||
        device.lastClientHeartbeat ||
        device.lastServiceHeartbeat;



    // 🔹 Today’s activity info from backend
    const activityToday = device?.activityToday || null;

    // When did work start today?
    const firstChunkAt = activityToday?.firstChunkAt || null;
    const workStartLabel =
        firstChunkAt
            ? new Date(firstChunkAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
            })
            : null;

    // Current activity state based on latest fresh chunk + presence
    const rawActivityState: "active" | "idle" | null | undefined =
        activityToday?.activityState;

    let currentActivityLabel = "No recent data";
    let currentActivityTone: "emerald" | "amber" | "slate" = "slate";

    if (device.clientStatus !== "online") {
        currentActivityLabel = "Offline";
        currentActivityTone = "slate";
    } else if (rawActivityState === "active") {
        currentActivityLabel = "Active now";
        currentActivityTone = "emerald";
    } else if (rawActivityState === "idle") {
        currentActivityLabel = "Idle now";
        currentActivityTone = "amber";
    }


    const activity = (() => {
        const src = device?.activityToday || null;
        const active = Math.max(0, Number(src?.activeSeconds ?? 0));
        const idle = Math.max(0, Number(src?.idleSeconds ?? 0));
        const total = active + idle;
        const pct = total > 0 ? Math.round((active / total) * 100) : 0;
        return { active, idle, total, pct, good: active >= idle };
    })();

    const lastPending = summary?.lastPending ?? device?.commandsSummary?.lastPending ?? null;
    const lastAck = summary?.lastAck ?? device?.commandsSummary?.lastAck ?? null;
    const totals = summary?.totals ?? device?.commandsSummary?.totals ?? {};

    const handleDeviceRefresh = async () => {
        await refetchDevices();
        qc.invalidateQueries({ queryKey: ["devices-optimized"] });
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all text-sm space-y-3">
            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                        {device.profileURL ? (
                            <img src={device.profileURL} className="h-12 w-12 rounded-full object-cover" alt="" />
                        ) : (
                            <div className="h-12 w-12 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
                                {(device.name ?? device.username ?? "U").slice(0, 1).toUpperCase()}
                            </div>
                        )}
                        <div className="absolute -bottom-0 -right-0">
                            <StatusDot online={device.clientStatus === "online"} />
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                            {device.name ?? device.username ?? "Unassigned"}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[220px]">
                            {device.designation ?? "—"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[240px]">
                            {device.deviceId}
                        </div>
                    </div>
                </div>

                <button
                    className="text-slate-400 hover:text-slate-700"
                    onClick={handleDeviceRefresh}
                    title="Refresh"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* META: last seen + work start today + current activity */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2 flex flex-col gap-1">
                <div className="text-xs text-slate-600">
                    <span className="mr-1">Last seen:</span>
                    {lastSeen ? (
                        <span title={fmtLocal(lastSeen)}>{fmtAgo(lastSeen)} ago</span>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </div>

                <div className="text-xs text-slate-600">
                    <span className="mr-1">Work started today:</span>
                    {workStartLabel ? (
                        <span title={firstChunkAt}>{workStartLabel}</span>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-600">Current status:</span>
                    <StatPill
                        label=""
                        value={currentActivityLabel}
                        tone={currentActivityTone}
                        title={currentActivityLabel}
                    />
                </div>
            </div>


            {/* TODAY'S ACTIVITY (ring color: green when active >= idle, else red) */}
            <div className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                    <MiniRadial percent={activity.pct} good={activity.good} />
                    <div className="flex-1">
                        <div className="mt-0.5 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>Total</span>
                                <span className="font-semibold">
                                    {activity.total > 0 ? fmtHMS(activity.total) : "—"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>Active</span>
                                <span className="font-semibold">
                                    {activity.total > 0 ? fmtHMS(activity.active) : "—"}
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className="h-full bg-emerald-400"
                                    style={{
                                        width:
                                            activity.total > 0
                                                ? `${Math.min(100, (activity.active / Math.max(activity.total, 1)) * 100)}%`
                                                : "0%",
                                    }}
                                />
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                                <span>Idle</span>
                                <span className="font-semibold">
                                    {activity.total > 0 ? fmtHMS(activity.idle) : "—"}
                                </span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                    className="h-full bg-rose-300"
                                    style={{
                                        width:
                                            activity.total > 0
                                                ? `${Math.min(100, (activity.idle / Math.max(activity.total, 1)) * 100)}%`
                                                : "0%",
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* COMMANDS (all bundled: header actions + totals + last pending/ack) */}
            <div className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                    <div className="text-xs font-medium text-slate-900">Commands</div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setOpenCmd(true)}
                            className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600"
                            title="Send Command"
                        >
                            <Send className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setOpenHistory(true)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                            title="Command History"
                        >
                            <ListChecks className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Mini totals inside Commands */}
                <div className="flex items-center gap-1 mb-2">
                    <StatPill
                        label="Pending"
                        value={Number(totals?.pending ?? 0)}
                        tone="amber"
                        title="Total pending commands"
                    />
                    <StatPill
                        label="Ack"
                        value={Number(totals?.acknowledged ?? 0)}
                        tone="emerald"
                        title="Total acknowledged commands"
                    />
                </div>

                {summariesLoading ? (
                    <div className="text-xs text-slate-400">Updating command summary…</div>
                ) : lastPending || lastAck ? (
                    <div className="space-y-1.5 text-xs text-slate-700">
                        {lastPending && (
                            <div>
                                <span className="font-semibold text-amber-600">Pending:</span>{" "}
                                <span className="font-medium">{lastPending.type}</span>{" "}
                                <span className="text-slate-400">({fmtLocal(lastPending.createdAt)})</span>
                            </div>
                        )}
                        {lastAck && (
                            <div>
                                <span className="font-semibold text-emerald-600">Ack:</span>{" "}
                                <span className="font-medium">{lastAck.type}</span>{" "}
                                <span className="text-slate-400">({fmtLocal(lastAck.acknowledgedAt)})</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400">No recent commands.</div>
                )}
            </div>

            {/* OTHER ACTIONS */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setOpenAssign(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Assign"
                >
                    <User className="h-4 w-4" />
                </button>

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setOpenLogs(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                        title="Open Logs"
                    >
                        <ScrollText className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setOpenApps(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                        title="Open Apps"
                    >
                        <Grid2x2 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setOpenTitles(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                        title="Open Titles"
                    >
                        <AppWindow className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* MODALS */}
            <DeviceAssignModal open={openAssign} onClose={() => setOpenAssign(false)} device={device} onToast={onToast} />
            <DeviceCommandModal open={openCmd} onClose={() => setOpenCmd(false)} device={device} onToast={onToast} />
            <DeviceHistoryModal open={openHistory} onClose={() => setOpenHistory(false)} device={device} />
            <DeviceLogsModal open={openLogs} onClose={() => setOpenLogs(false)} device={device} />
            <DeviceAppsModal open={openApps} onClose={() => setOpenApps(false)} device={device} />
            <DeviceTitlesModal open={openTitles} onClose={() => setOpenTitles(false)} device={device} />
        </div>
    );
}
