export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'OWNER' 
  | 'HR_SUPERVISOR' 
  | 'HR_EXECUTIVE' 
  | 'HR_INTERN' 
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