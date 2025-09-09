import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getHealth, getUserConfig, updateConfig } from '../utils/api';
import { useState, useEffect } from 'react';

export default function HealthPage() {
  const queryClient = useQueryClient();

  const healthQ = useQuery({ queryKey: ['health'], queryFn: getHealth });

  // Example: hardcode deviceId until you have real one
  const deviceId = 'DEVICE-123';

  const configQ = useQuery({
    queryKey: ['config', deviceId],
    queryFn: () => getUserConfig(deviceId),
  });

  const [chunkTime, setChunkTime] = useState(300);
  const [idleThreshold, setIdleThreshold] = useState(60);
  const [isZaiminaarEnabled, setIsZaiminaarEnabled] = useState(false);

  const [userName, setUserName] = useState('');
  const [userProfileImageURL, setUserProfileImageURL] = useState('');

  // sync state when config loads
  useEffect(() => {
    if (configQ.data) {
      setChunkTime(configQ.data.chunkTime);
      setIdleThreshold(configQ.data.idleThresholdPerChunk);
      setIsZaiminaarEnabled(configQ.data.isZaiminaarEnabled);
      setUserName(configQ.data.name);
      setUserProfileImageURL(configQ.data.profileURL);
    }
  }, [configQ.data]);

  const mutation = useMutation({
    mutationFn: updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config', deviceId] });
    },
  });

  const handleSave = () => {
    mutation.mutate({
      chunkTime: Number(chunkTime),
      idleThresholdPerChunk: Number(idleThreshold),
      isZaiminaarEnabled,
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Health</h1>

      {/* Health card */}
      <div className="card">
        <div className="card-body">
          {healthQ.isLoading
            ? 'Loading health...'
            : healthQ.error
            ? String((healthQ.error as any)?.message ?? healthQ.error)
            : <pre className="text-sm overflow-auto">{JSON.stringify(healthQ.data, null, 2)}</pre>}
        </div>
      </div>

      {/* Config card */}
      <div className="card">
        <div className="card-body space-y-3">
          <h2 className="font-semibold mb-2">Config</h2>

          {configQ.isLoading
            ? 'Loading config...'
            : configQ.error
            ? String((configQ.error as any)?.message ?? configQ.error)
            : (
              <>
                {/* User Info */}
                <div className="flex items-center gap-3 mb-4">
                  <img
                    src={userProfileImageURL}
                    alt="profile"
                    className="w-10 h-10 rounded-full border"
                  />
                  <span className="font-medium">{userName}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium">Chunk Time (seconds)</label>
                  <input
                    type="number"
                    value={chunkTime}
                    onChange={e => setChunkTime(Number(e.target.value))}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium">Idle Threshold Per Chunk (seconds)</label>
                  <input
                    type="number"
                    value={idleThreshold}
                    onChange={e => setIdleThreshold(Number(e.target.value))}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Zaiminaar Enabled</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4 mr-2"
                      checked={isZaiminaarEnabled}
                      onChange={e => setIsZaiminaarEnabled(e.target.checked)}
                    />
                    <span className="text-sm">Enable Zaiminaar</span>
                  </div>
                </div>

                <button
                  className="btn mt-2"
                  onClick={handleSave}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending ? 'Saving...' : 'Save Config'}
                </button>

                {mutation.error && (
                  <div className="text-red-600 text-sm mt-1">
                    Error: {String((mutation.error as any)?.message ?? mutation.error)}
                  </div>
                )}
                {mutation.isSuccess && (
                  <div className="text-green-600 text-sm mt-1">
                    ✅ Config saved successfully
                  </div>
                )}
              </>
            )}
        </div>
      </div>
    </div>
  );
}
