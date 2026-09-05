import React, { useState } from 'react';
import { 
  Building, 
  Users, 
  ShieldCheck, 
  History, 
  Lock, 
  UserPlus 
} from 'lucide-react';
import { useApp } from '../../context';
import { TeamMember } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    currentCompany, 
    teamMembers, 
    addTeamMember, 
    auditLogs 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'team' | 'security' | 'audit'>('profile');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMember['role']>('support_agent');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    addTeamMember(inviteName, inviteEmail, inviteRole);
    setIsInviteModalOpen(false);
    setInviteName('');
    setInviteEmail('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Workspace Settings & Governance</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure company profile, manage team access roles, review tenant isolation, and inspect security audit logs.
        </p>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'profile', label: 'Company Profile', icon: Building },
          { id: 'team', label: 'Team & RBAC Roles', icon: Users, count: teamMembers.length },
          { id: 'security', label: 'Security & Tenant Isolation', icon: ShieldCheck },
          { id: 'audit', label: 'Audit Logs', icon: History, count: auditLogs.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Company Profile */}
      {activeSubTab === 'profile' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 max-w-2xl text-xs">
          <h3 className="text-sm font-bold text-slate-900 mb-2">Company Information</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Workspace Name</label>
              <input
                type="text"
                readOnly
                value={currentCompany.name}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Domain</label>
              <input
                type="text"
                readOnly
                value={currentCompany.domain}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Industry</label>
              <input
                type="text"
                readOnly
                value={currentCompany.industry}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Tenant ID</label>
              <input
                type="text"
                readOnly
                value={currentCompany.id}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-500 text-xs"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Team Members & RBAC */}
      {activeSubTab === 'team' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Team Members & Access Control</h3>
              <p className="text-xs text-slate-500">Manage who can edit agent settings and take over live chats.</p>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Invite Member</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-3">Name & Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teamMembers.map(tm => (
                  <tr key={tm.id} className="hover:bg-slate-50">
                    <td className="py-3">
                      <p className="font-bold text-slate-900">{tm.name}</p>
                      <span className="text-[11px] text-slate-500 font-mono">{tm.email}</span>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-slate-100 text-slate-700">
                        {tm.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{tm.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Security & Tenant Isolation */}
      {activeSubTab === 'security' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Multi-Tenant Isolation Guarantee</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Agent-as-a-Service enforces cryptographic and namespace isolation. A tenant company can <strong>never</strong> access, search, or mutate another company's knowledge base or customer conversations.
            </p>
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 font-mono text-[11px] space-y-1.5 text-slate-700">
              <div>• <strong>Tenant Partition ID:</strong> {currentCompany.id}</div>
              <div>• <strong>Vector DB Namespace:</strong> vpc_ns_{currentCompany.slug}</div>
              <div>• <strong>Encryption Standard:</strong> AES-256 GCM (Customer-Managed KMS Keys)</div>
              <div>• <strong>RBAC Enforcement:</strong> Kernel-level schema validation</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Data Retention & Compliance</h3>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Specify how long customer conversation transcripts and tool traces are stored in your secure workspace.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Conversation Retention Policy</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                  <option value="90">90 Days (Standard)</option>
                  <option value="180">180 Days (Extended)</option>
                  <option value="365">365 Days (Compliance Archive)</option>
                  <option value="forever">Indefinite</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="mask-pii" defaultChecked className="rounded text-indigo-600" />
                <label htmlFor="mask-pii" className="font-semibold text-slate-700">Auto-mask customer PII (Credit cards, passwords, SSN)</label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Audit Logs */}
      {activeSubTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Security Audit Trail</h3>
              <p className="text-xs text-slate-500">Immutable record of agent actions, knowledge indexing, and user logins.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase">
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Actor</th>
                  <th className="pb-3">Action Type</th>
                  <th className="pb-3">Event Details</th>
                  <th className="pb-3">IP Address</th>
                  <th className="pb-3">Severity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                    <td className="py-3 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 font-semibold text-slate-900 whitespace-nowrap">{log.actor}</td>
                    <td className="py-3 font-bold text-indigo-700 whitespace-nowrap">{log.action}</td>
                    <td className="py-3 text-slate-600 font-sans max-w-md">{log.details}</td>
                    <td className="py-3 text-slate-400">{log.ipAddress}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        log.severity === 'critical' ? 'bg-rose-100 text-rose-800' :
                        log.severity === 'warning' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Invite Team Member</h3>
            <p className="text-xs text-slate-500 mb-4">Add a team member to manage knowledge or handle human live chats.</p>

            <form onSubmit={handleInvite} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="priya@yourcompany.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Role & Permission</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  <option value="support_agent">Support Agent (Live Chat Takeover & View)</option>
                  <option value="admin">Admin (Full Agent & Knowledge Configuration)</option>
                  <option value="viewer">Viewer (Read-only Analytics)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
