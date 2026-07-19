import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function OrgAdminDashboard() {
  const [membersList, setMembersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Member Form State
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserDisplayName, setNewUserDisplayName] = useState('');
  const [newUserRole, setNewUserRole] = useState('student');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch('/api/org-admin/members', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      
      if (json.success) {
        setMembersList(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Failed to fetch organization details.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (membershipId: string, currentStatus: string) => {
    setSuccessMsg('');
    setErrorMsg('');
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch('/api/org-admin/members/status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ membershipId, status: newStatus })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg('Member status updated successfully.');
        fetchMembers(); // Reload list
      } else {
        setErrorMsg(json.error?.message || 'Failed to update member status.');
      }
    } catch (err) {
      setErrorMsg('Failed to communicate status updates.');
    }
  };

  const handleRemoveMember = async (membershipId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the organization?`)) {
      return;
    }
    
    setSuccessMsg('');
    setErrorMsg('');
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`/api/org-admin/members/${membershipId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg(`${name} was successfully removed from the organization.`);
        fetchMembers(); // Reload list
      } else {
        setErrorMsg(json.error?.message || 'Failed to remove member.');
      }
    } catch (err) {
      setErrorMsg('Failed to delete member connection.');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!newUserEmail || !newUserDisplayName || !newUserRole) {
      setErrorMsg('Email, name, and role are required fields.');
      return;
    }

    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch('/api/org-admin/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: newUserEmail,
          displayName: newUserDisplayName,
          roleName: newUserRole
        })
      });
      const json = await res.json();

      if (json.success) {
        setSuccessMsg(`User "${newUserDisplayName}" added to organization with role "${newUserRole}"! Default testing password is: Password123!`);
        setNewUserEmail('');
        setNewUserDisplayName('');
        setNewUserRole('student');
        fetchMembers(); // Reload list
      } else {
        setErrorMsg(json.error?.message || 'Failed to add user to organization.');
      }
    } catch (err) {
      setErrorMsg('Failed to connect to members creation API.');
    }
  };

  return (
    <DashboardLayout role="organization_admin">
      <div className="flex flex-col gap-8">
        
        {/* Messages banner */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-2 text-label-md font-medium">
            {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-4 mb-2 text-label-md font-medium">
            {errorMsg}
          </div>
        )}

        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">Organization Workspace Directory</h1>
          <p className="text-body-md text-on-surface-variant">
            Create new members, assign roles, toggle statuses, and suspend tenant access.
          </p>
        </div>

        {/* Add User Card Form */}
        <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
          <h3 className="text-headline-sm font-bold text-on-surface mb-6">Add User to Organization</h3>
          <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">Display Name *</label>
              <input
                type="text"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                placeholder="e.g. John Doe"
                value={newUserDisplayName}
                onChange={(e) => setNewUserDisplayName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">Email Address *</label>
              <input
                type="email"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                placeholder="e.g. john@acme.edu"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">Role Scope *</label>
              <select
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md bg-white"
                value={newUserRole}
                onChange={(e) => setNewUserRole(e.target.value)}
              >
                <option value="student">Student / User</option>
                <option value="faculty">Faculty / Teacher</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow-lg active:scale-95 animate-scale"
              >
                Create Member Account
              </button>
            </div>
          </form>
        </div>

        {/* Member list registry */}
        <div className="bg-white border border-outline-variant rounded-2xl shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-outline-variant flex justify-between items-center">
            <h3 className="text-headline-sm font-bold">Registered Members</h3>
            <button onClick={fetchMembers} className="text-primary text-label-md font-semibold hover:underline">Refresh</button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">Querying database...</div>
          ) : membersList.length === 0 ? (
            <div className="p-8 text-center text-on-surface-variant font-medium">No users currently registered in this organization.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-surface-container-low text-left border-b border-outline-variant text-label-md text-on-surface-variant font-semibold">
                    <th className="px-8 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Joined Date</th>
                    <th className="px-6 py-4">Membership Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {membersList.map((member) => (
                    <tr key={member.membership_id} className="border-b border-outline-variant hover:bg-surface-container-lowest/50 text-body-md">
                      <td className="px-8 py-4 font-semibold text-on-surface">{member.display_name}</td>
                      <td className="px-6 py-4 text-on-surface-variant">{member.email}</td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(member.joined_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-label-md font-medium border ${
                          member.status === 'active' 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {member.status}
                        </span>
                      </td>
                      <td className="px-8 py-4 text-right flex justify-end gap-3">
                        <button
                          onClick={() => handleToggleStatus(member.membership_id, member.status)}
                          className={`text-label-md font-semibold px-3 py-1.5 rounded-lg border transition ${
                            member.status === 'active'
                              ? 'border-red-200 text-red-700 hover:bg-red-50'
                              : 'border-green-200 text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {member.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                        
                        <button
                          onClick={() => handleRemoveMember(member.membership_id, member.display_name)}
                          className="text-label-md font-semibold text-on-surface-variant border border-outline hover:bg-surface-container-high px-3 py-1.5 rounded-lg transition"
                        >
                          Remove
                        </button>
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
