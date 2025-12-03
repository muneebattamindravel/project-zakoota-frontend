import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    RefreshCw, Send, User, FileText, AppWindow, Grid2x2
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
            className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-500" : "bg-rose-500"
                }`}
            aria-label={online ? "online" : "offline"}
            title={online ? "online" : "offline"}
        />
    );
}

function MiniRadial({ percent }: { percent: number }) {
    const data = useMemo(
        () => [{ name: "active", value: Math.min(100, Math.max(0, percent)) }],
        [percent]
    );
    return (
        <div className="w-16 h-16">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                    data={data}
                    innerRadius="78%"
                    outerRadius="100%"
                    startAngle={90}
                    endAngle={-270}
                >
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} axisLine={false} />
                    <RadialBar background dataKey="value" cornerRadius={10} isAnimationActive={false} />
                </RadialBarChart>
            </ResponsiveContainer>
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

    // Modals
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

    const activity = (() => {
        const src = device?.activityToday || null;
        const active = Math.max(0, Number(src?.activeSeconds ?? 0));
        const idle = Math.max(0, Number(src?.idleSeconds ?? 0));
        const total = active + idle;
        const pct = total > 0 ? Math.round((active / total) * 100) : 0;
        return { active, idle, total, pct };
    })();

    const lastPending = summary?.lastPending ?? device?.commandsSummary?.lastPending ?? null;
    const lastAck = summary?.lastAck ?? device?.commandsSummary?.lastAck ?? null;

    const handleDeviceRefresh = async () => {
        await refetchDevices();
        // If any code still caches summaries separately, this keeps it in sync harmlessly.
        qc.invalidateQueries({ queryKey: ["devices-optimized"] });
    };

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all text-sm space-y-3">
            {/* HEADER */}
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 min-w-0">
                    {device.profileURL ? (
                        <img src={device.profileURL} className="h-10 w-10 rounded-full object-cover" alt="" />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
                            {(device.name ?? device.username ?? "U").slice(0, 1).toUpperCase()}
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate max-w-[160px]">
                            {device.name ?? device.username ?? "Unassigned"}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[200px]">
                            {device.designation ?? "—"}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[220px]">
                            {device.deviceId}
                        </div>
                    </div>
                </div>
                <button
                    className="text-slate-400 hover:text-slate-700"
                    onClick={handleDeviceRefresh}
                    title="Refresh device & summaries"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* STATUS STRIP */}
            <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 px-3 py-2">
                <div className="flex items-center gap-2">
                    <StatusDot online={device.clientStatus === "online"} />
                    <span className="text-slate-700">Client</span>
                </div>
                <div className="text-xs text-slate-500">
                    <span className="mr-1">Last seen:</span>
                    <span title={fmtLocal(lastSeen)}>{fmtAgo(lastSeen)} ago</span>
                </div>
            </div>

            {/* TODAY'S ACTIVITY */}
            <div className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-3">
                    <MiniRadial percent={activity.pct} />
                    <div className="text-xs">
                        <div className="font-medium text-slate-900">
                            Today’s Activity{" "}
                            {activity.total > 0 ? (
                                <span className="ml-2 text-indigo-600">{activity.pct}% active</span>
                            ) : (
                                <span className="ml-2 text-slate-400">no data</span>
                            )}
                        </div>
                        <div className="text-slate-600 mt-1">
                            <span className="inline-block min-w-[64px]">
                                Active:{" "}
                                <span className="font-semibold">
                                    {activity.total > 0 ? fmtHMS(activity.active) : "—"}
                                </span>
                            </span>
                            <span className="inline-block min-w-[64px] ml-3">
                                Idle:{" "}
                                <span className="font-semibold">
                                    {activity.total > 0 ? fmtHMS(activity.idle) : "—"}
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* COMMAND SNAPSHOT */}
            <div className="rounded-xl border border-slate-200 p-3">
                {summariesLoading ? (
                    <div className="text-xs text-slate-400">Updating command summary…</div>
                ) : (lastPending || lastAck) ? (
                    <div className="space-y-1 text-xs text-slate-700">
                        {lastPending && (
                            <div>
                                <span className="font-semibold text-amber-600">Pending:</span>{" "}
                                <span>{lastPending.type}</span>{" "}
                                <span className="text-slate-400">({fmtLocal(lastPending.createdAt)})</span>
                            </div>
                        )}
                        {lastAck && (
                            <div>
                                <span className="font-semibold text-emerald-600">Ack:</span>{" "}
                                <span>{lastAck.type}</span>{" "}
                                <span className="text-slate-400">({fmtLocal(lastAck.acknowledgedAt)})</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-xs text-slate-400">No recent commands.</div>
                )}
            </div>

            {/* ACTIONS */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setOpenCmd(true)}
                    className="p-2 rounded-lg hover:bg-indigo-100 text-indigo-600"
                    title="Send Command"
                >
                    <Send className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setOpenAssign(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Assign"
                >
                    <User className="h-4 w-4" />
                </button>
                <button
                    onClick={() => setOpenHistory(true)}
                    className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                    title="Command History"
                >
                    <FileText className="h-4 w-4" />
                </button>

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={() => setOpenLogs(true)}
                        className="p-2 rounded-lg hover:bg-slate-100 text-slate-700"
                        title="Open Logs"
                    >
                        <FileText className="h-4 w-4" />
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
