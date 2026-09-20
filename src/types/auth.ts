export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'OWNER' 
  | 'HR_SUPERVISOR' 
  | 'HR_EXECUTIVE' 
  | 'HR_INTERN' 
  | 'HIRING_MANAGER'
  | 'TALENT_ACQUISITION'
  | 'FINANCE_OFFICER'
  | 'EXTERNAL_AUDITOR'
  | 'TEAM_MEMBER';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  jobTitle?: string;
  photoURL?: string;
  disabled?: boolean;
  createdAt?: any;
  updatedAt?: any;
}