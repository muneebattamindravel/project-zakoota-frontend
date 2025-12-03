// src/components/device/DeviceTitlessModal.tsx
import { Modal } from "../ui";

export default function DeviceTitlesModal({
  open, onClose, device,
}: { open: boolean; onClose: () => void; device: any }) {
  return (
    <Modal open={open} onClose={onClose}
      title={`Logs — ${device?.name ?? "Unassigned"} (${device?.deviceId})`}
      widthClass="w-[960px]"
    >
      <div className="text-slate-600 text-sm">
        {/* TODO: Replace with your titles table; filter by deviceId */}
        <p>Titles for <b>{device?.deviceId}</b> will appear here.</p>
      </div>
    </Modal>
  );
}
