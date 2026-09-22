import React, { useState } from 'react';
import { X, Users, Plus, Phone, Mail, Trash2, Edit2, Landmark } from 'lucide-react';
import { Project, ProjectTeamMember } from '../../types';
import { AddPartyView } from './AddPartyView';
import { confirmAction } from '../../lib/dialogService';
import { addNotification } from '../../lib/notificationService';

interface ProjectTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateTeam: (team: ProjectTeamMember[]) => void;
  onShowToast?: (msg: string) => void;
}

export const ProjectTeamModal: React.FC<ProjectTeamModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateTeam,
  onShowToast
}) => {
  const [teamList, setTeamList] = useState<ProjectTeamMember[]>(project.assigned_team || []);

  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  if (!isOpen) return null;

  if (isAdding || editingIndex !== null) {
    const editData = editingIndex !== null ? teamList[editingIndex] : null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
        <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
          <AddPartyView
            initialData={editData}
            onSave={(member) => {
              let updated: ProjectTeamMember[];
              if (editingIndex !== null) {
                updated = [...teamList];
                updated[editingIndex] = member;
                onShowToast?.(`Updated party details for ${member.name}`);
              } else {
                updated = [...teamList, member];
                onShowToast?.(`Added ${member.name} as ${member.role}`);
                // Notify newly added team member
                addNotification({
                  title: 'Assigned to Project',
                  message: `You have been added to project "${project.name}" as ${member.role}.`,
                  type: 'PROJECT_ASSIGNED',
                  recipient: member.name,
                  sender: 'Admin',
                  projectName: project.name,
                  projectId: project.id,
                });
              }
              setTeamList(updated);
              onUpdateTeam(updated);
              setIsAdding(false);
              setEditingIndex(null);
            }}
            onCancel={() => {
              setIsAdding(false);
              setEditingIndex(null);
            }}
            onShowToast={onShowToast}
          />
        </div>
      </div>
    );
  }

  const handleRemoveMember = async (idx: number) => {
    const member = teamList[idx];
    const confirmed = await confirmAction({
      title: 'Remove Team Member',
      message: `Are you sure you want to remove ${member.name} (${member.role}) from this project team?`,
      confirmText: 'Remove Member',
      cancelText: 'Cancel',
      variant: 'danger',
      icon: 'trash'
    });
    if (!confirmed) return;

    const updated = teamList.filter((_, i) => i !== idx);
    setTeamList(updated);
    onUpdateTeam(updated);
    onShowToast?.(`Removed ${member.name} from project team`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Project Site Team & Parties</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{project.client_name || project.name}</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing Team Members List */}
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {teamList.map((m, idx) => (
            <div 
              key={idx} 
              className="p-3.5 bg-white border border-slate-200/90 rounded-2xl flex flex-col justify-between hover:border-red-300 hover:shadow-xs transition-all"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-2xs">
                    {m.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-900 truncate">{m.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                        {m.role}
                      </span>
                      {m.party_id && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          ID: {m.party_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingIndex(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Edit details"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(idx)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove Member"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Extra badges */}
              <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-slate-500">
                {m.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" />
                    {m.phone}
                  </span>
                )}
                {m.email && (
                  <span className="flex items-center gap-1 truncate max-w-[150px]">
                    <Mail className="w-3 h-3 text-slate-400" />
                    {m.email}
                  </span>
                )}
                {m.aadhaar_number && (
                  <span className="text-slate-400 font-mono">
                    Aadhaar: •••• {m.aadhaar_number.slice(-4)}
                  </span>
                )}
                {m.pan_number && (
                  <span className="text-slate-400 font-mono">
                    PAN: {m.pan_number}
                  </span>
                )}
                {m.bank_account && (
                  <span className="flex items-center gap-1 text-slate-400 font-mono">
                    <Landmark className="w-3 h-3 text-slate-400" />
                    •••• {m.bank_account.slice(-4)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add New Member Button */}
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Party / Member</span>
        </button>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
