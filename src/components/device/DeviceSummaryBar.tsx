import { Monitor, Wifi, WifiOff, Clock } from "lucide-react";

interface DeviceSummaryBarProps {
    devices: any[];
}

export default function DeviceSummaryBar({ devices }: DeviceSummaryBarProps) {
    const total = devices?.length ?? 0;
    const online = devices?.filter(
        (d) => d.clientStatus === "online"
    ).length ?? 0;
    const offline = total - online;

    // Placeholder average active % (to be real once we add active/idle data)
    const avgActivePercent = devices?.length
        ? Math.round(Math.random() * 20 + 70)
        : 0;

    const summaryItems = [
        { label: "Total Devices", value: total, icon: <Monitor className="h-5 w-5" /> },
        { label: "Online", value: online, icon: <Wifi className="h-5 w-5 text-green-500" /> },
        { label: "Offline", value: offline, icon: <WifiOff className="h-5 w-5 text-red-500" /> },
        { label: "Avg Active %", value: `${avgActivePercent}%`, icon: <Clock className="h-5 w-5 text-indigo-500" /> },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {summaryItems.map((item) => (
                <div
                    key={item.label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow-sm"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100">
                        {item.icon}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-500">{item.label}</span>
                        <span className="text-lg font-semibold text-slate-800">
                            {item.value}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
