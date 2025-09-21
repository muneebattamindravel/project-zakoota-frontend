import { useQuery } from '@tanstack/react-query';
import { listErrors } from '../utils/api';

export default function ErrorsPage() {
  const q = useQuery({
    queryKey: ['errors'],
    queryFn: () => listErrors(),
  });

  const errors = q.data?.items ?? [];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Device Errors</h1>
      <div className="card">
        <div className="card-body">
          {q.isLoading ? (
            'Loading...'
          ) : q.error ? (
            'Error loading errors'
          ) : errors.length === 0 ? (
            <p>No errors found</p>
          ) : (
            <table className="text-sm w-full">
              <thead>
                <tr>
                  <th>Device ID</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((err: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td>{err.deviceId}</td>
                    <td>{err.errorType}</td>
                    <td>{err.message}</td>
                    <td>{new Date(err.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
