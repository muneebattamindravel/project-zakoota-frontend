// src/components/device/DeviceAppsModal.tsx
import { Modal } from "../ui";

export default function DeviceAppsModal({
  open, onClose, device,
}: { open: boolean; onClose: () => void; device: any }) {
  return (
    <Modal open={open} onClose={onClose}
      title={`Apps — ${device?.name ?? "Unassigned"} (${device?.deviceId})`}
      widthClass="w-[960px]"
    >
      <div className="text-slate-600 text-sm">
        {/* TODO: Replace with your apps list; filter by deviceId */}
        <p>Installed/used apps for <b>{device?.deviceId}</b> will appear here.</p>
        <p className="mt-2 text-slate-500">Plug into your ReportsApps APIs and components; the modal is ready.</p>
      </div>
    </Modal>
  );
}
