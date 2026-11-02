import {
  Check,
  Key,
  Plus,
  RefreshCw,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { triggerHaptic } from '../../lib/haptics';

interface UserItem {
  id: string;
  username: string;
  role: 'admin' | 'master' | 'player';
  isActive: boolean;
  createdAt: string;
  permissions: {
    canRollDice: boolean;
    canUseLoot: boolean;
    canUseAiLoot: boolean;
    canManageNotes: boolean;
    canManagePackages: boolean;
  };
}

interface TeamItem {
  id: string;
  name: string;
  description: string;
  member_count: number;
  note_count: number;
}

interface ApiKeyItem {
  id: string;
  key_name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
}

export const AdminManagementPanel: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'teams' | 'agents'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);

  // Create User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'player' | 'master' | 'admin'>('player');

  // Create Team Form State
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamDesc, setNewTeamDesc] = useState('');

  // Create Agent Key State
  const [newAgentName, setNewAgentName] = useState('');
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {}
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
        if (data.teams && data.teams.length > 0 && !selectedTeamId) {
          setSelectedTeamId(data.teams[0].id);
        }
      }
    } catch {}
  };

  const fetchApiKeys = async (teamId: string) => {
    if (!teamId) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/api-keys`);
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys || []);
      }
    } catch {}
  };

  useEffect(() => {
    fetchUsers();
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeamId) {
      fetchApiKeys(selectedTeamId);
    }
  }, [selectedTeamId]);

  const handleTogglePermission = async (user: UserItem, permKey: keyof UserItem['permissions']) => {
    triggerHaptic('tap', true);
    const updatedPerms = {
      ...user.permissions,
      [permKey]: !user.permissions[permKey],
    };

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: updatedPerms }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, permissions: updatedPerms } : u))
        );
      }
    } catch {}
  };

  const handleToggleActive = async (user: UserItem) => {
    triggerHaptic('tap', true);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, isActive: !u.isActive } : u))
        );
      }
    } catch {}
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) return;

    setLoading(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setFeedback(`Usuário "${newUsername}" criado com sucesso.`);
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        setFeedback(`Erro: ${data.error}`);
      }
    } catch {
      setFeedback('Falha de conexão com o servidor.');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 4000);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;

    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName, description: newTeamDesc }),
      });
      if (res.ok) {
        setNewTeamName('');
        setNewTeamDesc('');
        fetchTeams();
      }
    } catch {}
  };

  const handleCreateAgentKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName || !selectedTeamId) return;

    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyName: newAgentName,
          scopes: ['notes:read', 'notes:write'],
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreatedRawKey(data.rawKey);
        setNewAgentName('');
        fetchApiKeys(selectedTeamId);
      }
    } catch {}
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Deseja realmente revogar esta chave de IA? O agente perderá o acesso imediatamente.')) {
      return;
    }
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchApiKeys(selectedTeamId);
      }
    } catch {}
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 sm:p-6 mb-8 backdrop-blur-md">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Painel de Governança & VPS
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                PostgreSQL + RBAC
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Controle de usuários, restrições por módulo, equipes compartilhadas e chaves de Agentes de IA.
            </p>
          </div>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'users'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Usuários & RBAC
          </button>
          <button
            onClick={() => setActiveSubTab('teams')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'teams'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Equipes / Mesas
          </button>
          <button
            onClick={() => setActiveSubTab('agents')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeSubTab === 'agents'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Agentes de IA
          </button>
        </div>
      </div>

      {feedback && (
        <div className="mt-4 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. ABA DE USUÁRIOS & RBAC */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="mt-6 space-y-6">
          {/* Formulário Novo Usuário */}
          <form onSubmit={handleCreateUser} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-cyan-400" />
              Adicionar Novo Usuário
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Nome de usuário"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
              <input
                type="password"
                placeholder="Senha inicial"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                required
              />
              <select
                value={newRole}
                onChange={(e: any) => setNewRole(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="player">Jogador (Player)</option>
                <option value="master">Mestre (Master)</option>
                <option value="admin">Administrador (Admin)</option>
              </select>
              <button
                type="submit"
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Cadastrar
              </button>
            </div>
          </form>

          {/* Tabela de Usuários */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-medium">Usuário</th>
                  <th className="pb-3 font-medium">Papel</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-center">Dados</th>
                  <th className="pb-3 font-medium text-center">Loot</th>
                  <th className="pb-3 font-medium text-center">IA Gemini</th>
                  <th className="pb-3 font-medium text-center">Notas</th>
                  <th className="pb-3 font-medium text-center">Pacotes</th>
                  <th className="pb-3 font-medium text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 font-semibold text-slate-200 flex items-center gap-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                      {u.username}
                    </td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase ${
                          u.role === 'admin'
                            ? 'bg-rose-500/20 text-rose-300'
                            : u.role === 'master'
                            ? 'bg-purple-500/20 text-purple-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                          u.isActive ? 'bg-emerald-400' : 'bg-rose-400'
                        }`}
                      />
                      <span className="text-slate-400">{u.isActive ? 'Ativo' : 'Bloqueado'}</span>
                    </td>

                    {/* Checkboxes de Permissões RBAC */}
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canRollDice}
                        onChange={() => handleTogglePermission(u, 'canRollDice')}
                        disabled={u.role === 'admin'}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canUseLoot}
                        onChange={() => handleTogglePermission(u, 'canUseLoot')}
                        disabled={u.role === 'admin'}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canUseAiLoot}
                        onChange={() => handleTogglePermission(u, 'canUseAiLoot')}
                        disabled={u.role === 'admin'}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canManageNotes}
                        onChange={() => handleTogglePermission(u, 'canManageNotes')}
                        disabled={u.role === 'admin'}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="checkbox"
                        checked={u.permissions.canManagePackages}
                        onChange={() => handleTogglePermission(u, 'canManagePackages')}
                        disabled={u.role === 'admin'}
                        className="rounded border-slate-700 text-cyan-500 focus:ring-0"
                      />
                    </td>

                    <td className="py-3 text-right">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            u.isActive
                              ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                          }`}
                        >
                          {u.isActive ? 'Bloquear' : 'Desbloquear'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ABA DE EQUIPES / MESAS */}
      {/* ========================================================================= */}
      {activeSubTab === 'teams' && (
        <div className="mt-6 space-y-6">
          <form onSubmit={handleCreateTeam} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Criar Nova Mesa / Equipe
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Nome da Campanha / Mesa"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                required
              />
              <input
                type="text"
                placeholder="Descrição (ex: Campanha Cyberpunk Sexta-feira)"
                value={newTeamDesc}
                onChange={(e) => setNewTeamDesc(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Criar Equipe
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 hover:border-purple-500/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-bold text-slate-100">{team.name}</h5>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">
                      {team.note_count} notas
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{team.description || 'Sem descrição'}</p>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-800/60">
                  <span>{team.member_count} jogadores</span>
                  <button
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setActiveSubTab('agents');
                    }}
                    className="text-cyan-400 hover:underline flex items-center gap-1 text-[11px]"
                  >
                    <Key className="w-3 h-3" />
                    Gerenciar Agentes IA
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. ABA DE AGENTES DE IA EXTERNOS */}
      {/* ========================================================================= */}
      {activeSubTab === 'agents' && (
        <div className="mt-6 space-y-6">
          <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl text-xs text-slate-300 space-y-1">
            <p className="font-semibold text-emerald-400 flex items-center gap-2">
              <Key className="w-4 h-4" />
              API Gateway para Agentes Autônomos de IA
            </p>
            <p className="text-slate-400">
              Gere chaves com escopo seguro para permitir que Claude, ChatGPT, n8n ou scripts Python leiam e insiram notas no banco SQL desta mesa.
            </p>
          </div>

          {/* Selecionar Equipe Alvo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <label className="text-xs text-slate-400">Mesa / Equipe Selecionada:</label>
            <select
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Formulário Nova Chave */}
          <form onSubmit={handleCreateAgentKey} className="bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <h4 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              Gerar Nova Chave de API para Agente
            </h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Identificação do Agente (ex: Agente Historiador n8n)"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                required
              />
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-4 py-2 rounded-lg text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Key className="w-4 h-4" />
                Gerar Chave de Acesso
              </button>
            </div>
          </form>

          {/* Exibição Única da Chave Gerada */}
          {createdRawKey && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/40 space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4" />
                Copie sua chave agora (Não será exibida novamente):
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={createdRawKey}
                  className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-3 py-2 text-xs text-amber-200 font-mono select-all"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(createdRawKey);
                    alert('Chave copiada para a área de transferência!');
                  }}
                  className="px-3 py-2 bg-amber-500 text-slate-950 font-bold rounded-lg text-xs hover:bg-amber-400 transition-colors"
                >
                  Copiar
                </button>
              </div>
            </div>
          )}

          {/* Lista de Chaves Ativas */}
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-slate-400">Chaves Ativas para esta Mesa:</h5>
            {apiKeys.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Nenhuma chave de agente configurada para esta mesa.</p>
            ) : (
              apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/50 border border-slate-800 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-semibold text-slate-200">{k.key_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Prefixo: <span className="text-emerald-400">{k.key_prefix}***</span> | Escopos: {k.scopes.join(', ')}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRevokeKey(k.id)}
                    className="p-2 rounded-lg bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors"
                    title="Revogar Chave"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

