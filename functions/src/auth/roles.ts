import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { auth, db, FieldValue } from '../config/firebase';
import { logAuditEvent } from '../audit/logger';

const VALID_ROLES = [
  'SUPER_ADMIN',
  'OWNER',
  'HR_SUPERVISOR',
  'HR_EXECUTIVE',
  'HR_INTERN',
  'TEAM_MEMBER'
];

/**
 * Bootstraps the very first Super Admin account.
 * Only allowed if no Super Admin currently exists in the system or with an authorized bootstrap secret.
 */
export const bootstrapSuperAdmin = onCall(async (request) => {
  const { email, bootstrapSecret } = request.data || {};
  if (!email) {
    throw new HttpsError('invalid-argument', 'Email is required.');
  }

  // Check if any Super Admin already exists
  const existingSuperAdmins = await db.collection('users')
    .where('role', 'in', ['SUPER_ADMIN', 'OWNER'])
    .limit(1)
    .get();

  const isFirstTime = existingSuperAdmins.empty;
  const configuredSecret = process.env.BOOTSTRAP_SECRET || 'pileandloop-hros-bootstrap-2026';

  if (!isFirstTime && bootstrapSecret !== configuredSecret) {
    throw new HttpsError('permission-denied', 'Super Admin already initialized. Use authorized management functions.');
  }

  // Find user by email
  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
  } catch (err: any) {
    throw new HttpsError('not-found', `No Firebase Auth user found with email ${email}. Please create the account in Firebase Auth or Sign Up first.`);
  }

  // Set custom claims
  await auth.setCustomUserClaims(userRecord.uid, { role: 'SUPER_ADMIN' });

  // Update or create user profile document
  const userRef = db.collection('users').doc(userRecord.uid);
  const existingDoc = await userRef.get();

  await userRef.set({
    uid: userRecord.uid,
    email: userRecord.email,
    displayName: userRecord.displayName || 'Super Admin',
    role: 'SUPER_ADMIN',
    disabled: false,
    createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  await logAuditEvent(
    { uid: userRecord.uid, name: userRecord.displayName || 'Bootstrap', email: userRecord.email || email, role: 'SUPER_ADMIN' },
    'USER_CREATED',
    'users',
    userRecord.uid,
    null,
    { role: 'SUPER_ADMIN', email: userRecord.email },
    { action: 'Super Admin Bootstrapped' }
  );

  return { success: true, message: `User ${email} successfully promoted to SUPER_ADMIN.` };
});

/**
 * Creates an internal HR or Team Member account with designated role.
 */
export const createInternalUser = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER') {
    throw new HttpsError('permission-denied', 'Only Super Admin can create internal accounts.');
  }

  const { email, password, displayName, role, department, jobTitle } = request.data || {};
  if (!email || !password || !displayName || !role) {
    throw new HttpsError('invalid-argument', 'Missing required user fields.');
  }

  if (!VALID_ROLES.includes(role)) {
    throw new HttpsError('invalid-argument', `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }

  // Create Firebase Auth user
  const newUser = await auth.createUser({
    email,
    password,
    displayName,
    emailVerified: true,
  });

  // Assign Custom Claim
  await auth.setCustomUserClaims(newUser.uid, { role });

  // Store in users collection
  await db.collection('users').doc(newUser.uid).set({
    uid: newUser.uid,
    email,
    displayName,
    role,
    department: department || 'Human Resources',
    jobTitle: jobTitle || role,
    disabled: false,
    createdBy: callerAuth.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || callerAuth.token.email, email: callerAuth.token.email || '', role: callerRole },
    'USER_CREATED',
    'users',
    newUser.uid,
    null,
    { email, role, displayName },
    { action: 'Internal User Created' }
  );

  return { success: true, uid: newUser.uid, message: `Account created for ${displayName} (${role})` };
});

/**
 * Updates a user's role.
 */
export const updateUserRole = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER') {
    throw new HttpsError('permission-denied', 'Only Super Admin can update roles.');
  }

  const { targetUid, newRole } = request.data || {};
  if (!targetUid || !newRole || !VALID_ROLES.includes(newRole)) {
    throw new HttpsError('invalid-argument', 'Invalid target UID or role.');
  }

  const userDocRef = db.collection('users').doc(targetUid);
  const userDoc = await userDocRef.get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'User profile not found.');
  }

  const oldRole = userDoc.data()?.role;

  // Update Custom Claims
  await auth.setCustomUserClaims(targetUid, { role: newRole });

  // Update Firestore user document
  await userDocRef.update({
    role: newRole,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || callerAuth.token.email, email: callerAuth.token.email || '', role: callerRole },
    'ROLE_CHANGED',
    'users',
    targetUid,
    { role: oldRole },
    { role: newRole },
    { updatedBy: callerAuth.uid }
  );

  return { success: true, message: `Updated role for ${targetUid} to ${newRole}.` };
});

/**
 * Disables an internal user's account.
 */
export const disableInternalUser = onCall(async (request) => {
  const callerAuth = request.auth;
  if (!callerAuth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const callerRole = callerAuth.token.role;
  if (callerRole !== 'SUPER_ADMIN' && callerRole !== 'OWNER') {
    throw new HttpsError('permission-denied', 'Only Super Admin can disable accounts.');
  }

  const { targetUid, disabled } = request.data || {};
  if (!targetUid || typeof disabled !== 'boolean') {
    throw new HttpsError('invalid-argument', 'Invalid target UID or disabled state.');
  }

  await auth.updateUser(targetUid, { disabled });
  await db.collection('users').doc(targetUid).update({
    disabled,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await logAuditEvent(
    { uid: callerAuth.uid, name: callerAuth.token.name || callerAuth.token.email, email: callerAuth.token.email || '', role: callerRole },
    'USER_DISABLED',
    'users',
    targetUid,
    null,
    { disabled },
    { action: disabled ? 'Account Disabled' : 'Account Re-enabled' }
  );

  return { success: true, message: `User account ${targetUid} set to disabled=${disabled}.` };
});