import { store } from '../store';

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  getIdTokenResult: (forceRefresh?: boolean) => Promise<{ claims: Record<string, any> }>;
}

let activeUser: User | null = null;
const authListeners = new Set<(user: User | null) => void>();

// Load initial user from localStorage if saved
try {
  const saved = localStorage.getItem('hros_active_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    activeUser = {
      uid: parsed.uid,
      email: parsed.email,
      displayName: parsed.displayName,
      getIdTokenResult: async () => ({ claims: { role: parsed.role } })
    };
  }
} catch {
  // Ignore localStorage errors
}

export const getAuth = (_app?: any) => ({
  currentUser: activeUser
});

export const onAuthStateChanged = (
  _auth: any,
  callback: (user: User | null) => void
): (() => void) => {
  callback(activeUser);
  authListeners.add(callback);
  return () => {
    authListeners.delete(callback);
  };
};

export const setMockUser = (user: User | null, role: string) => {
  activeUser = user;
  if (user) {
    localStorage.setItem(
      'hros_active_user',
      JSON.stringify({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role
      })
    );
  } else {
    localStorage.removeItem('hros_active_user');
  }
  authListeners.forEach(cb => cb(activeUser));
};

export const signInWithEmailAndPassword = async (
  _auth: any,
  email: string,
  password?: string
): Promise<{ user: User }> => {
  const lower = email.toLowerCase().trim();
  const inputPass = (password || '').trim();

  // 1. Check Super Admin credentials
  if (lower === 'pileandloop@gmail.com') {
    if (inputPass !== 'fourty420') {
      throw new Error('Invalid password for Super Admin. Please use the correct password.');
    }
    const user: User = {
      uid: 'usr-admin',
      email: 'pileandloop@gmail.com',
      displayName: 'Pile & Loop Super Admin',
      getIdTokenResult: async () => ({ claims: { role: 'SUPER_ADMIN' } })
    };
    setMockUser(user, 'SUPER_ADMIN');
    return { user };
  }

  // 2. Check in People collection
  const people = store.getCollection('people');
  const person = Object.values(people).find(p => (p.email || '').toLowerCase().trim() === lower);

  if (person) {
    // Check if account is pending approval
    if (person.status === 'PENDING_APPROVAL') {
      throw new Error('Your account is pending approval by the Super Admin (pileandloop@gmail.com). Please wait for role allocation.');
    }
    if (person.status === 'INACTIVE') {
      throw new Error('This account has been deactivated. Please contact the Super Admin.');
    }
    if (person.password && inputPass && person.password !== inputPass) {
      throw new Error('Invalid password for this account.');
    }

    const user: User = {
      uid: person.uid || person.id,
      email: person.email,
      displayName: person.fullName || person.displayName || 'Staff Member',
      getIdTokenResult: async () => ({ claims: { role: person.role || 'TEAM_MEMBER' } })
    };
    setMockUser(user, person.role || 'TEAM_MEMBER');
    return { user };
  }

  // 3. Check pending user requests
  const userRequests = store.getCollection('userRequests');
  const pendingReq = Object.values(userRequests).find(r => (r.email || '').toLowerCase().trim() === lower);
  if (pendingReq && pendingReq.status === 'PENDING') {
    throw new Error('Your sign-up request is pending review by the Super Admin. Once your role is allocated, you can log in.');
  }

  // 4. Role keywords fallback for demo accounts
  let role = 'TEAM_MEMBER';
  let displayName = 'Staff Member';
  let uid = 'usr-' + lower.replace(/[^a-z0-9]/g, '');

  if (lower.includes('supervisor')) {
    role = 'HR_SUPERVISOR';
    displayName = 'Kamran Raza';
    uid = 'usr-super';
  } else if (lower.includes('executive')) {
    role = 'HR_EXECUTIVE';
    displayName = 'Fatima Sheikh';
    uid = 'usr-exec';
  } else if (lower.includes('intern')) {
    role = 'HR_INTERN';
    displayName = 'Zeeshan Malik';
    uid = 'usr-intern';
  } else if (lower.includes('member')) {
    role = 'TEAM_MEMBER';
    displayName = 'Saad Qureshi';
    uid = 'usr-member';
  } else {
    throw new Error('Account not found. Please sign up or request access from the Super Admin.');
  }

  const user: User = {
    uid,
    email,
    displayName,
    getIdTokenResult: async () => ({ claims: { role } })
  };

  setMockUser(user, role);
  return { user };
};

export const signOut = async (_auth?: any): Promise<void> => {
  setMockUser(null, '');
};

// Sign Up & Request Access function
export const submitUserRequest = async (data: {
  fullName: string;
  email: string;
  password?: string;
  department: string;
  requestedRole: string;
  reason?: string;
}) => {
  const email = data.email.toLowerCase().trim();
  const people = store.getCollection('people');
  const existing = Object.values(people).find(p => (p.email || '').toLowerCase().trim() === email);
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const reqId = 'req-' + Date.now().toString(36);
  const newRequest = {
    id: reqId,
    fullName: data.fullName,
    email,
    password: data.password || 'fourty420',
    department: data.department || 'General',
    requestedRole: data.requestedRole || 'TEAM_MEMBER',
    reason: data.reason || 'New team member registration',
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  // Add to userRequests
  store.setDocument('userRequests', reqId, newRequest);

  // Also notify Super Admin
  const notifId = 'notif-' + Date.now().toString(36);
  store.setDocument('notifications', notifId, {
    id: notifId,
    recipientId: 'usr-admin',
    title: 'New Account Access Request',
    message: `${data.fullName} (${email}) requested ${data.requestedRole} access for ${data.department}.`,
    type: 'USER_ACCESS_REQUEST',
    read: false,
    createdAt: new Date().toISOString()
  });

  return { success: true, message: 'Request submitted successfully to Super Admin.' };
};

// Approve user request and allocate role (Super Admin only)
export const approveUserRequest = async (requestId: string, allocatedRole: string, department?: string) => {
  const req = store.getCollection('userRequests')[requestId];
  if (!req) throw new Error('Request not found.');

  const personId = 'usr-' + Date.now().toString(36);
  const newPerson = {
    id: personId,
    uid: personId,
    fullName: req.fullName,
    email: req.email,
    password: req.password || 'fourty420',
    role: allocatedRole,
    department: department || req.department || 'General',
    designation: allocatedRole.replace('_', ' '),
    status: 'ACTIVE',
    createdAt: new Date().toISOString()
  };

  // Save to people
  store.setDocument('people', personId, newPerson);

  // Mark request approved
  store.updateDocument('userRequests', requestId, {
    status: 'APPROVED',
    allocatedRole,
    approvedAt: new Date().toISOString()
  });

  return { success: true, person: newPerson };
};

// Reject user request
export const rejectUserRequest = async (requestId: string, reason?: string) => {
  store.updateDocument('userRequests', requestId, {
    status: 'REJECTED',
    rejectionReason: reason || 'Access denied by Super Admin',
    rejectedAt: new Date().toISOString()
  });
  return { success: true };
};
