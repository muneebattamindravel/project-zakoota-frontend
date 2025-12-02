import { useState } from "react";
import { Modal } from "../ui";
import LoadingButton from "../ui/LoadingButton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { assignDevice } from "../../utils/api";

export default function DeviceAssignModal({ open, onClose, device, onToast }: any) {
    const qc = useQueryClient();

    const [username, setUsername] = useState(device.username ?? "");
    const [name, setName] = useState(device.name ?? "");
    const [designation, setDesignation] = useState(device.designation ?? "");
    const [profileURL, setProfileURL] = useState(device.profileURL ?? "");

    const assignM = useMutation({
        mutationFn: () =>
            assignDevice(device.deviceId, {
                username: username || undefined,
                name: name || undefined,
                designation: designation || undefined,
                profileURL: profileURL || undefined,
            }),
        onSuccess: () => {
            onToast({ tone: "success", title: "Device updated" });
            onClose();
            qc.invalidateQueries({ queryKey: ["devices"] });
        },
        onError: (e: any) =>
            onToast({ tone: "error", title: "Update failed", desc: e?.message }),
    });

    return (
        <Modal open={open} onClose={onClose} title={`Assign Device: ${device.deviceId}`}>
            <div className="grid gap-3">
                <input
                    className="border rounded-md px-3 py-2"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                />
                <input
                    className="border rounded-md px-3 py-2"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Full Name"
                />
                <input
                    className="border rounded-md px-3 py-2"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    placeholder="Designation"
                />
                <input
                    className="border rounded-md px-3 py-2"
                    value={profileURL}
                    onChange={(e) => setProfileURL(e.target.value)}
                    placeholder="Profile Image URL"
                />
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
                    pending={assignM.isPending}
                    pendingText="Saving…"
                    onClick={() => assignM.mutate()}
                >
                    Save
                </LoadingButton>
            </div>
        </Modal>
    );
}
