import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "../ui";
import LoadingButton from "../ui/LoadingButton";
import { RefreshCw, Send, User, FileText } from "lucide-react";
import { fmtFull12 } from "../../utils/format";
import DeviceAssignModal from "./DeviceAssignModal";
import DeviceCommandModal from "./DeviceCommandModal";
import DeviceHistoryModal from "./DeviceHistoryModal";

type CommandSummary = {
    lastPending?: any | null;
    lastAck?: any | null;
    lastCompleted?: any | null;
    totals?: {
        pending?: number;
        acknowledged?: number;
        completed?: number;
    };
};

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

    const handleDeviceRefresh = async () => {
        await refetchDevices();
        // Batch summaries are refreshed by the page; nothing else needed here.
    };

    const lastPending = summary?.lastPending ?? null;
    const lastAck = summary?.lastAck ?? null;

    const lastSeen =
        device.lastSeen ||
        device.lastClientHeartbeat ||
        device.lastServiceHeartbeat;

    return (
        <div className="device-card rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition-all text-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    {device.profileURL ? (
                        <img
                            src={device.profileURL}
                            className="h-10 w-10 rounded-full object-cover"
                            alt=""
                        />
                    ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-500 text-white flex items-center justify-center font-semibold">
                            {(device.name ?? device.username ?? "U")
                                .slice(0, 1)
                                .toUpperCase()}
                        </div>
                    )}
                    <div>
                        <div className="font-medium text-slate-900 truncate w-36">
                            {device.name ?? device.username ?? "Unassigned"}
                        </div>
                        <div className="text-xs text-slate-500">
                            {device.designation ?? "-"}
                        </div>
                    </div>
                </div>
                <button
                    className="text-slate-400 hover:text-slate-700"
                    onClick={handleDeviceRefresh}
                    title="Refresh device + summaries"
                >
                    <RefreshCw className="h-4 w-4" />
                </button>
            </div>

            {/* Status Row (service removed as requested) */}
            <div className="flex justify-between items-start mb-2">
                <div>
                    <div>
                        Client:{" "}
                        <Badge tone={device.clientStatus === "online" ? "green" : "red"}>
                            {device.clientStatus ?? "offline"}
                        </Badge>
                    </div>
                </div>
                <div className="text-xs text-right text-slate-500 leading-tight">
                    <div>Last Seen</div>
                    <div>{fmtFull12(lastSeen)}</div>
                </div>
            </div>

            {/* Command Summary */}
            {summariesLoading ? (
                <div className="text-xs text-slate-400 border-t pt-1 mt-2">
                    Updating command summary…
                </div>
            ) : (lastPending || lastAck) ? (
                <div className="border-t pt-1 mt-2 space-y-1 text-xs text-slate-600">
                    {lastPending && (
                        <div>
                            <span className="font-semibold text-amber-600">Pending:</span>{" "}
                            <span>{lastPending.type}</span>{" "}
                            <span className="text-slate-400">
                                ({fmtFull12(lastPending.createdAt)})
                            </span>
                        </div>
                    )}
                    {lastAck && (
                        <div>
                            <span className="font-semibold text-green-600">Ack:</span>{" "}
                            <span>{lastAck.type}</span>{" "}
                            <span className="text-slate-400">
                                ({fmtFull12(lastAck.acknowledgedAt)})
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <div className="text-xs text-slate-400 border-t pt-1 mt-2">
                    No recent commands.
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 border-t mt-2">
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
            </div>

            {/* Modals */}
            <DeviceAssignModal
                open={openAssign}
                onClose={() => setOpenAssign(false)}
                device={device}
                onToast={onToast}
            />
            <DeviceCommandModal
                open={openCmd}
                onClose={() => setOpenCmd(false)}
                device={device}
                onToast={onToast}
            />
            <DeviceHistoryModal
                open={openHistory}
                onClose={() => setOpenHistory(false)}
                device={device}
            />
        </div>
    );
}
