import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal } from "../ui";
import LoadingButton from "../ui/LoadingButton";
import { getMatrixUsers, linkDeviceToMatrixUser } from "../../utils/api";
import { Search, Link2, CheckCircle2 } from "lucide-react";

export default function DeviceMatrixLinkModal({
  open,
  onClose,
  device,
  onToast,
}: any) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    device.userId ?? null
  );

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["matrix-users"],
    queryFn: getMatrixUsers,
    enabled: open,
    staleTime: 60_000,
  });

  const linkM = useMutation({
    mutationFn: () => linkDeviceToMatrixUser(device.deviceId, selectedUserId!),
    onSuccess: () => {
      onToast({ tone: "success", title: "Device linked to Matrix user" });
      onClose();
      qc.invalidateQueries({ queryKey: ["devices"] });
    },
    onError: (e: any) =>
      onToast({ tone: "error", title: "Link failed", desc: e?.message }),
  });

  const filtered = users.filter((u: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  const currentlyLinked = users.find((u: any) => u.userId === device.userId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Link to Matrix User: ${device.deviceId}`}
      widthClass="w-[520px]"
    >
      {currentlyLinked && (
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-indigo-50 border border-indigo-200 px-3 py-2 text-sm text-indigo-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>
            Currently linked to{" "}
            <span className="font-semibold">{currentlyLinked.name}</span>{" "}
            <span className="text-indigo-400">({currentlyLinked.username})</span>
          </span>
        </div>
      )}

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          className="w-full border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Search by name, username, or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
        {isLoading && (
          <div className="py-8 text-center text-sm text-slate-400">
            Loading Matrix users…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">
            No users found.
          </div>
        )}
        {filtered.map((u: any) => {
          const isSelected = selectedUserId === u.userId;
          return (
            <button
              key={u.userId}
              type="button"
              onClick={() => setSelectedUserId(u.userId)}
              className={`w-full text-left flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                isSelected
                  ? "bg-indigo-50 border border-indigo-300"
                  : "hover:bg-slate-50 border border-transparent"
              }`}
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-500 text-white flex items-center justify-center text-sm font-semibold">
                {(u.name ?? u.username ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {u.name}
                </div>
                <div className="text-xs text-slate-500 truncate">
                  {u.username} · {u.email}
                </div>
              </div>
              {u.roles?.length > 0 && (
                <span className="shrink-0 text-[10px] font-medium bg-slate-100 text-slate-600 rounded px-1.5 py-0.5">
                  {u.roles[0]}
                </span>
              )}
              {isSelected && (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-indigo-600" />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <LoadingButton
          className="bg-white border text-slate-700 hover:bg-slate-50"
          onClick={onClose}
        >
          Cancel
        </LoadingButton>
        <LoadingButton
          className="bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1.5"
          pending={linkM.isPending}
          pendingText="Linking…"
          onClick={() => linkM.mutate()}
          disabled={!selectedUserId}
        >
          <Link2 className="h-4 w-4" />
          Link User
        </LoadingButton>
      </div>
    </Modal>
  );
}
