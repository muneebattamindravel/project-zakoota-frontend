import { useState, useMemo } from "react";
import { Modal } from "../ui";
import LoadingButton from "../ui/LoadingButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCommand } from "../../utils/api";

// Full, exact command lists (restored)
const SERVICE_COMMANDS = [
    "restart-service",
    "restart-client",
] as const;

const CLIENT_COMMANDS = [
    'show-popup-announcement',
    'show-popup-message',
    'show-popup-celebration',
    'focus-hours-start',
    'focus-hours-end',
    'hide',
    'refresh',
    'lock',
    'unlock',
    'ping',
    'attention',
    'disco',
    'rain',
    'samosa-party',
    'open-action',
    'quote',
    'requires-update',
] as const;

type Target = "client" | "service";
type ServiceCommand = typeof SERVICE_COMMANDS[number];
type ClientCommand = typeof CLIENT_COMMANDS[number];
type CommandType = ServiceCommand | ClientCommand;

export default function DeviceCommandModal({
    open,
    onClose,
    device,
    onToast,
}: {
    open: boolean;
    onClose: () => void;
    device: any;
    onToast: (t: { tone: "success" | "error"; title: string; desc?: string }) => void;
}) {
    const qc = useQueryClient();

    const [target, setTarget] = useState<Target>("client");
    const [type, setType] = useState<CommandType>("refresh");
    const [payload, setPayload] = useState<string>("");

    // Dynamic command list by target
    const availableCommands = useMemo<CommandType[]>(() => {
        return target === "service" ? [...SERVICE_COMMANDS] : [...CLIENT_COMMANDS];
    }, [target]);

    // Ensure type stays valid if target changes
    useMemo(() => {
        if (!availableCommands.includes(type)) {
            setType(availableCommands[0]);
        }
    }, [availableCommands, type]);

    const createM = useMutation({
        mutationFn: () =>
            createCommand({
                deviceId: device.deviceId,
                target, // "client" | "service"
                type,   // exact command string
                // optional JSON payload; keep as string for now to not break existing impl
                payload: payload?.trim() ? safeParseOrString(payload) : undefined,
            }),
        onSuccess: () => {
            onToast({ tone: "success", title: "Command sent" });
            // Invalidate devices and batch summaries (page handles both)
            qc.invalidateQueries({ queryKey: ["devices"] });
            qc.invalidateQueries({ queryKey: ["commands-summary-batch"] });
            onClose();
            setPayload("");
        },
        onError: (e: any) => {
            onToast({ tone: "error", title: "Failed to send", desc: e?.message });
        },
    });

    return (
        <Modal
            open={open}
            onClose={onClose}
            title={`Send Command — ${device?.name ?? device?.deviceId ?? ""}`}
            widthClass="w-[520px]"
        >
            <div className="grid gap-3">
                {/* Target */}
                <div>
                    <label className="block text-sm font-medium mb-1">Target</label>
                    <select
                        className="border rounded-md px-3 py-2 w-full"
                        value={target}
                        onChange={(e) => setTarget(e.target.value as Target)}
                    >
                        <option value="client">client</option>
                        <option value="service">service</option>
                    </select>
                </div>

                {/* Command type (filtered) */}
                <div>
                    <label className="block text-sm font-medium mb-1">Command</label>
                    <select
                        className="border rounded-md px-3 py-2 w-full"
                        value={type}
                        onChange={(e) => setType(e.target.value as CommandType)}
                    >
                        {availableCommands.map((cmd) => (
                            <option key={cmd} value={cmd}>
                                {cmd}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Optional payload (kept generic to avoid breaking existing payloads) */}
                <div>
                    <label className="block text-sm font-medium mb-1">Payload (optional)</label>
                    <textarea
                        className="border rounded-md px-3 py-2 w-full min-h-[90px] font-mono text-xs"
                        placeholder='Raw JSON or text. Ex: {"message":"Hello"}'
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        If JSON is provided, we’ll attempt to parse it before sending.
                    </p>
                </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
                <LoadingButton
                    className="bg-white border text-slate-700 hover:bg-slate-50"
                    onClick={onClose}
                >
                    Cancel
                </LoadingButton>
                <LoadingButton
                    className="bg-indigo-600 text-white hover:bg-indigo-700"
                    pending={createM.isPending}
                    pendingText="Sending…"
                    onClick={() => createM.mutate()}
                >
                    Send
                </LoadingButton>
            </div>
        </Modal>
    );
}

/** If the string parses as JSON, return the object. Otherwise keep the original string. */
function safeParseOrString(s: string): any {
    try {
        const v = JSON.parse(s);
        return v;
    } catch {
        return s;
    }
}
