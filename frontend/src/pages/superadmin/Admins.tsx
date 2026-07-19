import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function SuperAdminAdmins() {
  const [adminsList, setAdminsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAdmins();
  }, []);

  const fetchAdmins = async () => {
    setLoading(true);
    const token = localStorage.getItem('accessToken');
    
    try {
      const res = await fetch('/api/admin/org-admins', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setAdminsList(json.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout role="super_admin">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">Organization Administrators</h1>
          <p className="text-body-md text-on-surface-variant">View authorized users delegated with organization-level roles.</p>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-sm font-bold">Registered Org Admins</h3>
            <button onClick={fetchAdmins} className="text-primary text-label-md font-semibold hover:underline">Refresh</button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">Querying database...</div>
          ) : adminsList.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">No Org Admins registered in the system.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-left border-b border-outline-variant text-label-md text-on-surface-variant font-semibold">
                    <th className="px-8 py-4">Display Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Registered Date</th>
                    <th className="px-8 py-4 text-right">Account Status</th>
                  </tr>
                </thead>
                <tbody>
                  {adminsList.map((adm) => (
                    <tr key={adm.id} className="border-b border-outline-variant hover:bg-surface-container-lowest/50 text-body-md">
                      <td className="px-8 py-4 font-semibold text-on-surface">{adm.display_name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{adm.email}</td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(adm.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-label-md font-medium border border-green-200">
                          {adm.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
