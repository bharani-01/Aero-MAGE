import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function SuperAdminOrgs() {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgDesc, setOrgDesc] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [formError, setFormError] = useState('');
  const [orgsList, setOrgsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchOrgs();
  }, []);

  const fetchOrgs = async () => {
    setLoading(true);
    setFormSuccess('');
    setFormError('');
    const token = localStorage.getItem('accessToken');
    
    try {
      const res = await fetch('/api/admin/organizations', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setOrgsList(json.data);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess('');
    setFormError('');
    
    if (!orgName || !orgSlug || !ownerEmail) {
      setFormError('Please fill in all required fields.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: orgName,
          slug: orgSlug,
          description: orgDesc,
          ownerEmail
        })
      });

      const json = await res.json();
      if (json.success) {
        setFormSuccess(`Organization "${orgName}" created successfully! Default password is "Password123!".`);
        setOrgName('');
        setOrgSlug('');
        setOrgDesc('');
        setOwnerEmail('');
        fetchOrgs(); // Refresh list
      } else {
        setFormError(json.error?.message || 'Failed to create organization.');
      }
    } catch (err) {
      setFormError('Network connection failure. Please try again.');
    }
  };

  return (
    <DashboardLayout role="super_admin">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">Tenant Management</h1>
          <p className="text-body-md text-on-surface-variant">Create and monitor isolated multi-tenant organization workspaces.</p>
        </div>

        {/* Form card */}
        <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
          <h3 className="text-headline-sm font-bold text-on-surface mb-6">Create New Organization</h3>
          
          {formSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6 text-label-md font-medium">
              {formSuccess}
            </div>
          )}
          
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-6 text-label-md font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleCreateOrg} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">Organization Name *</label>
              <input
                type="text"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                placeholder="e.g. Stanford Academy"
                value={orgName}
                onChange={(e) => {
                  setOrgName(e.target.value);
                  setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }}
                required
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">Unique URL Slug *</label>
              <input
                type="text"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                placeholder="e.g. stanford-academy"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-label-md font-semibold text-on-surface mb-2">Admin Owner Email *</label>
              <input
                type="email"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                placeholder="e.g. administrator@stanford.edu"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                required
              />
              <p className="text-label-md text-on-surface-variant mt-1.5">
                If no user matches this email, a new administrator account will be created.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-label-md font-semibold text-on-surface mb-2">Description</label>
              <textarea
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md h-24"
                placeholder="Brief notes about this tenant..."
                value={orgDesc}
                onChange={(e) => setOrgDesc(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/10 active:scale-95"
              >
                Provision Organization
              </button>
            </div>
          </form>
        </div>

        {/* Listing Organizations */}
        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-sm font-bold">Active Organizations</h3>
            <button onClick={fetchOrgs} className="text-primary text-label-md font-semibold hover:underline">Refresh</button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">Querying database...</div>
          ) : orgsList.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">No registered organizations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-left border-b border-outline-variant text-label-md text-on-surface-variant font-semibold">
                    <th className="px-8 py-4">Name</th>
                    <th className="px-6 py-4">Slug</th>
                    <th className="px-6 py-4">Admin Owner</th>
                    <th className="px-6 py-4">Members</th>
                    <th className="px-8 py-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orgsList.map((org) => (
                    <tr key={org.id} className="border-b border-outline-variant hover:bg-surface-container-lowest/50 text-body-md">
                      <td className="px-8 py-4 font-semibold text-on-surface">{org.name}</td>
                      <td className="px-6 py-4 text-on-surface-variant font-mono">{org.slug}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{org.owner?.email || 'N/A'}</td>
                      <td className="px-6 py-4 text-on-surface-variant font-semibold">{org.member_count}</td>
                      <td className="px-8 py-4 text-right">
                        <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full text-label-md font-medium border border-green-200">
                          {org.status}
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
