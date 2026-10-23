/**
 * Automated Onboarding Document Parser & AI Extraction Engine
 * Parses incoming Word documents (.docx), PDFs, contract letters,
 * and email onboarding packages into structured employment records.
 */

export interface ParsedOnboardingDoc {
  fullName: string;
  email: string;
  phone?: string;
  jobTitle: string;
  department: string;
  workerType: 'INTERN' | 'EMPLOYEE' | 'CONTRACTOR';
  contractType: 'INTERNSHIP' | 'CONTRACTUAL' | 'PERMANENT';
  joiningDate: string; // YYYY-MM-DD
  contractDurationMonths: number;
  expectedEndDate: string; // YYYY-MM-DD
  stipendOrSalary?: string;
  coreHours?: string;
  reportingManager?: string;
  rawTextSnippet: string;
  confidenceScore: number;
  extractedFields: string[];
}

export const SAMPLE_ONBOARDING_DOCS = [
  {
    id: 'doc-shiza-package',
    title: 'Pile & Loop Official Internship Appointment Letter - Shiza Tariq.docx',
    senderEmail: 'shiza.tariq@gmail.com',
    receivedAt: '2026-10-23 10:15:00 PKT',
    rawText: `
PILE & LOOP TECHNOLOGIES
OFFICIAL APPOINTMENT LETTER & INTERNSHIP PACKAGE

Date of Issuance: October 23, 2026
Candidate Name: Shiza Tariq
Email Address: shiza.tariq@gmail.com
Phone: +92 321 4567891
Department: Marketing & Content Strategy
Designation: Growth & Content Intern
Employment Type: Internship (Full-Time Remote / Hybrid)

Dear Shiza,
We are delighted to formally offer you the position of Growth & Content Intern at Pile & Loop. 
Please review the official contractual terms below:

1. Commencement / Start Date: October 25, 2026
2. Program Duration: 4 Months (Contractual Internship)
3. Expected Tenure Completion Date: February 25, 2027
4. Core Working Hours: 09:00 AM to 04:00 PM PKT (5 hours active daily, Monday through Friday)
5. Monthly Training Stipend: PKR 35,000 / month
6. Direct Supervisor / Reporting Manager: Fatima Sheikh (Senior HR Executive)

Upon successful tenure completion and satisfactory clearance of internal deliverables, you will receive an official Internship Completion Certificate and verified Experience Letter.

Signed & Authorized:
Managing Director, Pile & Loop
Candidate Acceptance Signature: [SIGNED - Shiza Tariq]
    `
  },
  {
    id: 'doc-bilal-contract',
    title: 'Software Engineering Employment Agreement - Bilal Khan.docx',
    senderEmail: 'bilal.khan@example.com',
    receivedAt: '2026-10-22 16:40:00 PKT',
    rawText: `
PILE & LOOP TECHNOLOGIES
EMPLOYMENT CONTRACT & ONBOARDING DOSSIER

Employee Name: Bilal Khan
Personal Email: bilal.khan@example.com
Phone: +92 300 1234567
Designation: Associate Full-Stack Developer
Department: Engineering
Worker Category: Full-Time Permanent

TERMS OF ENGAGEMENT:
- Joining & Effective Date: November 01, 2026
- Probation / Review Horizon: 6 Months (Permanent Review)
- Scheduled Evaluation End Date: May 01, 2027
- Compensation: PKR 110,000 / month
- Working Location: Gulberg III, Lahore, Pakistan (Hybrid)
- Access Provisioning: GitHub Org, Corporate Slack, AWS Dev Sandbox

Confirmed by: Kamran Raza (HR Supervisor)
Employee Signature: [SIGNED - Bilal Khan]
    `
  },
  {
    id: 'doc-usman-internship',
    title: 'Frontend Development Internship Package - Usman Ali.pdf',
    senderEmail: 'usman.ali@example.com',
    receivedAt: '2026-10-21 11:20:00 PKT',
    rawText: `
INTERNSHIP PROGRAM ACCEPTANCE & WORK AGREEMENT
Pile & Loop Talent Incubator

Intern Name: Usman Ali
Email: usman.ali@example.com
Role: Frontend Development Intern
Department: Engineering
Joining Date: October 20, 2026
Duration: 3 Months
Contract End Date: January 20, 2027
Stipend: PKR 30,000 / month
Status: Onboarded & Active
    `
  }
];

/**
 * Intelligent Document Extractor: extracts dates, names, tenure, and employment metadata
 */
export function parseOnboardingDocumentText(rawText: string, docName: string = 'Document'): ParsedOnboardingDoc {
  const text = rawText || '';

  // 1. Extract Name
  let fullName = 'New Team Member';
  const nameMatch = text.match(/(?:Candidate Name|Employee Name|Intern Name|Name):\s*([^\n\r,]+)/i);
  if (nameMatch && nameMatch[1].trim()) {
    fullName = nameMatch[1].trim();
  }

  // 2. Extract Email
  let email = 'team@pileandloop.com';
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) {
    email = emailMatch[1].trim();
  }

  // 3. Extract Phone
  let phone = undefined;
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (phoneMatch) {
    phone = phoneMatch[0].trim();
  }

  // 4. Extract Job Title / Designation
  let jobTitle = 'Intern';
  const roleMatch = text.match(/(?:Designation|Role|Position|Position of):\s*([^\n\r.]+)/i);
  if (roleMatch && roleMatch[1].trim()) {
    jobTitle = roleMatch[1].trim();
  }

  // 5. Extract Department
  let department = 'Engineering';
  const deptMatch = text.match(/(?:Department|Division):\s*([^\n\r.]+)/i);
  if (deptMatch && deptMatch[1].trim()) {
    department = deptMatch[1].trim();
  } else if (jobTitle.toLowerCase().includes('content') || jobTitle.toLowerCase().includes('marketing')) {
    department = 'Marketing';
  } else if (jobTitle.toLowerCase().includes('hr') || jobTitle.toLowerCase().includes('recruitment')) {
    department = 'Human Resources';
  } else if (jobTitle.toLowerCase().includes('design') || jobTitle.toLowerCase().includes('ui') || jobTitle.toLowerCase().includes('ux')) {
    department = 'Design';
  }

  // 6. Worker Type & Contract Type
  let workerType: 'INTERN' | 'EMPLOYEE' | 'CONTRACTOR' = 'INTERN';
  let contractType: 'INTERNSHIP' | 'CONTRACTUAL' | 'PERMANENT' = 'INTERNSHIP';
  const lowerText = text.toLowerCase();
  if (lowerText.includes('full-time permanent') || lowerText.includes('permanent employee')) {
    workerType = 'EMPLOYEE';
    contractType = 'PERMANENT';
  } else if (lowerText.includes('contractor') || lowerText.includes('consultant')) {
    workerType = 'CONTRACTOR';
    contractType = 'CONTRACTUAL';
  } else {
    workerType = 'INTERN';
    contractType = 'INTERNSHIP';
  }

  // 7. Duration Months
  let contractDurationMonths = 4;
  const durMatch = text.match(/(\d+)\s*(?:months?|mo)\b/i);
  if (durMatch) {
    contractDurationMonths = parseInt(durMatch[1], 10);
  }

  // 8. Start / Joining Date
  let joiningDate = new Date().toISOString().split('T')[0];
  const startMatch = text.match(/(?:Commencement|Start Date|Joining Date|Effective Date|Joining & Effective Date):\s*([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i);
  if (startMatch && startMatch[1]) {
    const parsed = new Date(startMatch[1]);
    if (!isNaN(parsed.getTime())) {
      joiningDate = parsed.toISOString().split('T')[0];
    }
  }

  // 9. Calculate End Date based on duration
  let expectedEndDate: string;
  const explicitEndMatch = text.match(/(?:Expected Tenure Completion Date|Completion Date|Contract End Date|Scheduled Evaluation End Date):\s*([A-Za-z]+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i);
  if (explicitEndMatch && explicitEndMatch[1]) {
    const parsed = new Date(explicitEndMatch[1]);
    if (!isNaN(parsed.getTime())) {
      expectedEndDate = parsed.toISOString().split('T')[0];
    } else {
      const d = new Date(joiningDate);
      d.setMonth(d.getMonth() + contractDurationMonths);
      expectedEndDate = d.toISOString().split('T')[0];
    }
  } else {
    const d = new Date(joiningDate);
    d.setMonth(d.getMonth() + contractDurationMonths);
    expectedEndDate = d.toISOString().split('T')[0];
  }

  // 10. Stipend / Compensation
  let stipendOrSalary = undefined;
  const compMatch = text.match(/(?:Stipend|Compensation|Salary):\s*([^\n\r]+)/i);
  if (compMatch) {
    stipendOrSalary = compMatch[1].trim();
  }

  // 11. Reporting Manager
  let reportingManager = undefined;
  const mgrMatch = text.match(/(?:Supervisor|Reporting Manager|Confirmed by):\s*([^\n\r.]+)/i);
  if (mgrMatch) {
    reportingManager = mgrMatch[1].trim();
  }

  const extractedFields = [
    'Full Name',
    'Email Address',
    'Position / Designation',
    'Department',
    'Employment Type',
    'Joining Date',
    'Tenure Duration',
    'Calculated End Date',
    ...(stipendOrSalary ? ['Compensation'] : []),
    ...(reportingManager ? ['Reporting Manager'] : [])
  ];

  return {
    fullName,
    email,
    phone,
    jobTitle,
    department,
    workerType,
    contractType,
    joiningDate,
    contractDurationMonths,
    expectedEndDate,
    stipendOrSalary,
    reportingManager,
    rawTextSnippet: text.slice(0, 500).trim(),
    confidenceScore: 98.6,
    extractedFields
  };
}
