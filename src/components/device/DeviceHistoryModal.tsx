import { useState } from "react";
import { Modal, Spinner, Badge } from "../ui";
import { useQuery } from "@tanstack/react-query";
import { listCommands } from "../../utils/api";
import { fmtFull12 } from "../../utils/format";

function prettyPayload(payload: any) {
    // Accepts object or JSON string; returns pretty-printed string or a fallback
    try {
        if (payload == null) return "—";
        if (typeof payload === "string" && payload.trim() === "") return "—";
        const obj = typeof payload === "string" ? JSON.parse(payload) : payload;
        return JSON.stringify(obj, null, 2);
    } catch {
        // Not JSON; return raw string
        return typeof payload === "string" ? payload : String(payload);
    }
}

function previewPayload(payload: any, max = 80) {
    const text = prettyPayload(payload).replace(/\s+/g, " ").trim();
    if (text === "—") return "—";
    return text.length > max ? text.slice(0, max) + "…" : text;
}

export default function DeviceHistoryModal({ open, onClose, device }: any) {
    const historyQ = useQuery({
        enabled: open,
        queryKey: ["commands-history", device.deviceId],
        queryFn: () => listCommands({ deviceId: device.deviceId, limit: 20, sort: "desc" }),
    });

    const history = Array.isArray(historyQ.data?.items) ? historyQ.data.items : [];
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const copy = async (txt: string) => {
        try {
            await navigator.clipboard.writeText(txt);
        } catch {
            // no-op
        }
    };

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Commands History – ${device?.name ?? "Unassigned"} (${device?.deviceId})`}
            widthClass="w-[900px]"
        >
            {historyQ.isLoading ? (
                <div className="flex items-center gap-2 text-slate-600">
                    <Spinner /> Loading history…
                </div>
            ) : history.length === 0 ? (
                <div className="text-slate-500">No commands yet.</div>
            ) : (
                <div className="table-wrap max-h-[480px] overflow-y-auto">
                    <table className="table text-sm">
                        <thead>
                            <tr>
                                <th>Target</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Ack</th>
                                <th className="w-[40%]">Payload</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((c: any) => {
                                const statusTone =
                                    c.status === "acknowledged" ? "green" : "gray";

                                const pretty = prettyPayload(c.payload);
                                const isExpanded = expandedId === c._id;

                                return (
                                    <tr key={c._id} className="align-top">
                                        <td>{c.target}</td>
                                        <td>{c.type}</td>
                                        <td>
                                            <Badge tone={statusTone}>{c.status}</Badge>
                                        </td>
                                        <td>{fmtFull12(c.createdAt)}</td>
                                        <td>{fmtFull12(c.acknowledgedAt)}</td>
                                        <td>
                                            {/* Preview row */}
                                            {!isExpanded ? (
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="text-slate-600 truncate">
                                                        {previewPayload(c.payload)}
                                                    </div>
                                                    <div className="shrink-0 flex gap-2">
                                                        <button
                                                            className="text-indigo-600 hover:underline"
                                                            onClick={() => setExpandedId(c._id)}
                                                        >
                                                            View
                                                        </button>
                                                        {pretty && pretty !== "—" && (
                                                            <button
                                                                className="text-slate-600 hover:underline"
                                                                onClick={() => copy(pretty)}
                                                            >
                                                                Copy
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                // Expanded JSON/code view
                                                <div className="rounded-md border bg-slate-50 p-2">
                                                    <pre className="whitespace-pre-wrap break-words text-xs font-mono text-slate-800 max-h-56 overflow-auto">
                                                        {pretty}
                                                    </pre>
                                                    <div className="mt-2 flex gap-3">
                                                        <button
                                                            className="text-indigo-600 hover:underline"
                                                            onClick={() => setExpandedId(null)}
                                                        >
                                                            Hide
                                                        </button>
                                                        {pretty && pretty !== "—" && (
                                                            <button
                                                                className="text-slate-600 hover:underline"
                                                                onClick={() => copy(pretty)}
                                                            >
                                                                Copy
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </Modal>
    );
}
