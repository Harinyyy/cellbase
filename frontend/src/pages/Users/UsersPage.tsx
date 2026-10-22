import { useEffect, useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import * as usersApi from '../../api/users';
import { ApiError } from '../../api/client';
import type { User, UserRole } from '../../types';
import { AppShell } from '../../components/layout/AppShell';
import { Modal } from '../../components/common/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/common/States';
import { formatDate } from '../../utils/format';

const ROLES: UserRole[] = ['researcher', 'admin'];

export function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  function loadUsers() {
    setError(null);
    usersApi.listUsers()
      .then(({ users: rows }) => setUsers(rows))
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load accounts.'));
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleDelete(account: User) {
    if (account.id === user?.id || !window.confirm(`Delete the account for ${account.full_name}?`)) return;
    try {
      await usersApi.deleteUser(account.id);
      setUsers((current) => current?.filter((item) => item.id !== account.id) ?? current);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete that account.');
    }
  }

  if (user?.role !== 'admin') return <Navigate to="/" replace />;

  return (
    <AppShell title="User access" subtitle="Create and manage accounts for your laboratory team.">
      <div className="page-header">
        <div className="page-header-copy">
          <h2>Team accounts</h2>
          <p>Passwords are stored as secure hashes. Each account’s role controls what it can manage.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Add account</button>
      </div>

      {error && <ErrorState message={error} onRetry={loadUsers} />}
      {!error && users === null && <LoadingState label="Loading accounts…" />}
      {!error && users?.length === 0 && <EmptyState title="No accounts found" />}
      {!error && users && users.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Created</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((account) => (
                <tr key={account.id}>
                  <td><strong>{account.full_name}</strong>{account.id === user.id && <span className="cell-muted"> (you)</span>}</td>
                  <td>{account.email}</td>
                  <td><span className={`badge ${account.role === 'admin' ? 'badge-culture' : 'badge-neutral'}`}>{account.role.replace('_', ' ')}</span></td>
                  <td>{formatDate(account.created_at)}</td>
                  <td>
                    {account.id === user.id ? <span className="cell-muted">Current account</span> : (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(account)}>Delete</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={(created) => {
        setUsers((current) => current ? [...current, created] : [created]);
        setShowCreate(false);
      }} />}
    </AppShell>
  );
}

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: (user: User) => void }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('researcher');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { user: created } = await usersApi.createUser({ full_name: fullName, email, password, role });
      onCreated(created);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Add a team account" description="Set an initial password and access role. The account holder can sign in right away." onClose={onClose}>
      {error && <div className="form-error" role="alert">{error}</div>}
      <form onSubmit={submit}>
        <div className="form-grid">
          <div className="form-field span-2"><label htmlFor="user-name">Full name</label><input id="user-name" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" /></div>
          <div className="form-field span-2"><label htmlFor="user-email">Email</label><input id="user-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
          <div className="form-field span-2"><label htmlFor="user-password">Initial password</label><input id="user-password" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
          <div className="form-field span-2"><label htmlFor="user-role">Role</label><select id="user-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>{ROLES.map((item) => <option key={item} value={item}>{item.replace('_', ' ')}</option>)}</select></div>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Creating…' : 'Create account'}</button>
        </div>
      </form>
    </Modal>
  );
}
