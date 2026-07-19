import { useState } from 'react';
import DashboardLayout from '../../components/DashboardLayout.tsx';

export default function ItAdminSmtp() {
  const [smtpHost, setSmtpHost] = useState('smtp.resend.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('resend');
  const [smtpPass, setSmtpPass] = useState('••••••••••••••••••••••••');
  const [success, setSuccess] = useState('');

  const handleSaveSmtp = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess('');
    setTimeout(() => {
      setSuccess('SMTP Configurations updated and verified successfully.');
    }, 500);
  };

  return (
    <DashboardLayout role="it_admin">
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-headline-lg font-bold text-on-surface mb-2">Technical Integrations</h1>
          <p className="text-body-md text-on-surface-variant">Configure custom relays, email systems, and SMTP credentials.</p>
        </div>

        <div className="bg-white border border-outline-variant rounded-2xl p-8 shadow-sm">
          <h3 className="text-headline-sm font-bold text-on-surface mb-6">SMTP Server Settings</h3>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 rounded-xl p-4 mb-6 text-label-md font-medium">
              {success}
            </div>
          )}

          <form onSubmit={handleSaveSmtp} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">SMTP Server Hostname</label>
              <input
                type="text"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md font-mono"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">SMTP Server Port</label>
              <input
                type="text"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md font-mono"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">SMTP Username</label>
              <input
                type="text"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-label-md font-semibold text-on-surface mb-2">SMTP Password</label>
              <input
                type="password"
                className="w-full border border-outline rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-label-md"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
              />
            </div>

            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="bg-primary text-white font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition shadow-lg shadow-primary/10 active:scale-95"
              >
                Save &amp; Test Connection
              </button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
