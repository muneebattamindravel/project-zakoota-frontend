// src/components/device/DeviceLogsModal.tsx
import { Modal } from "../ui";

export default function DeviceLogsModal({
  open, onClose, device,
}: { open: boolean; onClose: () => void; device: any }) {
  return (
    <Modal open={open} onClose={onClose}
      title={`Logs — ${device?.name ?? "Unassigned"} (${device?.deviceId})`}
      widthClass="w-[960px]"
    >
      <div className="text-slate-600 text-sm">
        {/* TODO: Replace with your logs table; filter by deviceId */}
        <p>Logs for <b>{device?.deviceId}</b> will appear here.</p>
        <p className="mt-2 text-slate-500">Hook this modal to your existing logs APIs and reuse table components from LogsExplorerPage.</p>
      </div>
    </Modal>
  );
}
