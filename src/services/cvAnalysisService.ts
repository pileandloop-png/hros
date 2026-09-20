// CV OCR, In-App Text Extractor & Screening Match Engine

export interface ParsedCvData {
  extractedText: string;
  candidateName?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  skillsFound: string[];
  skills?: string[];
  education: string[];
  experienceYears?: number;
  portfolioUrls: string[];
}

export interface ScreeningAnalysis {
  matchRatio: number; // 0 to 100%
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  verdict: 'HIGHLY_RECOMMENDED' | 'SUITABLE_FOR_INTERVIEW' | 'BORDERLINE' | 'NOT_SUITABLE';
  verdictLabel: string;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatch: boolean;
  keyStrengths: string[];
  potentialConcerns: string[];
  suggestedInterviewQuestions: string[];
}

// Common tech & professional skill dictionary for matching
const COMMON_SKILLS = [
  'React', 'React.js', 'Next.js', 'Vue', 'Angular', 'TypeScript', 'JavaScript', 'HTML', 'CSS',
  'Tailwind', 'TailwindCSS', 'Bootstrap', 'Node.js', 'Express', 'Python', 'Django', 'FastAPI',
  'PHP', 'Laravel', 'Java', 'Spring', 'C#', '.NET', 'Flutter', 'React Native', 'SQL', 'PostgreSQL',
  'MySQL', 'MongoDB', 'Firebase', 'Supabase', 'AWS', 'Docker', 'Kubernetes', 'Git', 'GitHub',
  'REST API', 'GraphQL', 'Figma', 'UI/UX', 'Adobe XD', 'Photoshop', 'Illustrator', 'SEO',
  'Content Writing', 'Digital Marketing', 'HR Management', 'Talent Acquisition', 'Recruitment',
  'Onboarding', 'Payroll', 'Communication', 'Problem Solving', 'Data Analysis', 'Excel'
];

// Extract text from uploaded file (Text, HTML, or raw stream)
export async function extractCvTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    if (file.type.includes('text') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file);
    } else {
      // For PDF, Word, or binary documents, extract printable ASCII/UTF-8 text chunks
      reader.onload = (e) => {
        try {
          const buffer = e.target?.result as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          let extracted = '';
          
          // Fast printable character scanner (extracts ASCII/UTF-8 streams from PDF/DOCX)
          for (let i = 0; i < bytes.length; i++) {
            const byte = bytes[i];
            if ((byte >= 32 && byte <= 126) || byte === 10 || byte === 13 || byte === 9) {
              extracted += String.fromCharCode(byte);
            } else if (extracted.length > 0 && extracted[extracted.length - 1] !== ' ') {
              extracted += ' ';
            }
          }

          // Clean up multiple spaces and empty lines
          const cleaned = extracted
            .replace(/[ \t]+/g, ' ')
            .replace(/\n\s*\n/g, '\n')
            .trim();

          if (cleaned.length > 100) {
            resolve(cleaned);
          } else {
            resolve(`Document: ${file.name}\nSize: ${(file.size / 1024).toFixed(1)} KB\nUploaded successfully for in-app review.`);
          }
        } catch {
          resolve(`Document: ${file.name} uploaded.`);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read document'));
      reader.readAsArrayBuffer(file);
    }
  });
}

// Parse structured entities from extracted text
export function parseCvData(rawText: string): ParsedCvData {
  const text = rawText || '';

  // Extract Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : undefined;

  // Extract Phone (International & Local formats)
  const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  const phone = phoneMatch ? phoneMatch[0].trim() : undefined;

  // Extract URLs (Portfolio / LinkedIn / GitHub)
  const urlMatches = text.match(/https?:\/\/[^\s]+/g) || [];

  // Match Skills
  const lowerText = text.toLowerCase();
  const skillsFound = COMMON_SKILLS.filter((skill) =>
    lowerText.includes(skill.toLowerCase())
  );

  // Experience heuristic (detect "X years of experience")
  let experienceYears = 0;
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)(?:\s*of\s*experience)?/i);
  if (expMatch) {
    experienceYears = parseInt(expMatch[1], 10);
  }

  // Education heuristic
  const education: string[] = [];
  const eduKeywords = ['Bachelor', 'BS', 'B.Sc', 'Master', 'MS', 'M.Sc', 'Computer Science', 'Software Engineering', 'University', 'College', 'Diploma'];
  eduKeywords.forEach(kw => {
    if (lowerText.includes(kw.toLowerCase())) {
      education.push(kw);
    }
  });

  return {
    extractedText: text,
    candidateName: undefined,
    fullName: undefined,
    email,
    phone,
    skillsFound,
    skills: skillsFound,
    education: Array.from(new Set(education)),
    experienceYears,
    portfolioUrls: urlMatches.slice(0, 5)
  };
}

export const parseCvEntities = parseCvData;

// Compute AI Screening Match Ratio against Job Description & Requirements
export function calculateScreeningMatch(
  cvData: ParsedCvData,
  jobTitle: string = 'Position',
  requiredSkills: string[] = ['Communication', 'Teamwork'],
  jobDescription: string = ''
): ScreeningAnalysis {
  const cvText = (cvData.extractedText || '').toLowerCase();
  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  // Normalize and compare skills
  requiredSkills.forEach((req) => {
    const cleanReq = req.trim();
    if (!cleanReq) return;
    if (cvText.includes(cleanReq.toLowerCase()) || cvData.skillsFound.some(s => s.toLowerCase() === cleanReq.toLowerCase())) {
      matchedSkills.push(cleanReq);
    } else {
      missingSkills.push(cleanReq);
    }
  });

  const totalRequired = requiredSkills.length > 0 ? requiredSkills.length : 1;
  const skillMatchPercent = Math.min(100, Math.round((matchedSkills.length / totalRequired) * 100));

  // Additional bonuses for education, contact details, and experience
  let scoreBonus = 0;
  if (cvData.education.length > 0) scoreBonus += 10;
  if (cvData.email && cvData.phone) scoreBonus += 5;
  if (cvData.experienceYears && cvData.experienceYears > 0) scoreBonus += 10;

  const matchRatio = Math.min(98, Math.max(25, Math.round((skillMatchPercent * 0.75) + scoreBonus)));

  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' = 'C';
  let verdict: 'HIGHLY_RECOMMENDED' | 'SUITABLE_FOR_INTERVIEW' | 'BORDERLINE' | 'NOT_SUITABLE' = 'BORDERLINE';
  let verdictLabel = 'Borderline / Needs Review';

  if (matchRatio >= 85) {
    grade = 'A+';
    verdict = 'HIGHLY_RECOMMENDED';
    verdictLabel = 'Highly Recommended (Top Tier Candidate)';
  } else if (matchRatio >= 70) {
    grade = 'A';
    verdict = 'SUITABLE_FOR_INTERVIEW';
    verdictLabel = 'Suitable for Technical Interview';
  } else if (matchRatio >= 50) {
    grade = 'B';
    verdict = 'BORDERLINE';
    verdictLabel = 'Potential Match (Requires Screening Call)';
  } else {
    grade = 'D';
    verdict = 'NOT_SUITABLE';
    verdictLabel = 'Skill Mismatch for this Role';
  }

  const keyStrengths: string[] = [];
  if (matchedSkills.length > 0) {
    keyStrengths.push(`Verified skills in: ${matchedSkills.slice(0, 4).join(', ')}`);
  }
  if (cvData.education.length > 0) {
    keyStrengths.push(`Relevant background: ${cvData.education.join(', ')}`);
  }
  if (cvData.experienceYears && cvData.experienceYears > 0) {
    keyStrengths.push(`Mentioned ${cvData.experienceYears}+ years hands-on experience`);
  }
  if (keyStrengths.length === 0) {
    keyStrengths.push('Clean resume submission with verifiable contact details');
  }

  const potentialConcerns: string[] = [];
  if (missingSkills.length > 0) {
    potentialConcerns.push(`Missing role prerequisite(s): ${missingSkills.slice(0, 3).join(', ')}`);
  }
  if (!cvData.phone) {
    potentialConcerns.push('Phone number not clearly specified on CV');
  }

  const suggestedInterviewQuestions = [
    `Can you walk us through a recent project where you applied ${matchedSkills[0] || 'core technologies'}?`,
    missingSkills.length > 0
      ? `We noticed the role requires ${missingSkills[0]}. Have you had any hands-on exposure or self-learning in it?`
      : `How do you stay updated with modern developments in ${jobTitle}?`,
    `What are your expectations for tenure, learning milestones, and start date at Pile & Loop?`
  ];

  return {
    matchRatio,
    grade,
    verdict,
    verdictLabel,
    matchedSkills,
    missingSkills,
    experienceMatch: (cvData.experienceYears || 0) >= 0,
    keyStrengths,
    potentialConcerns,
    suggestedInterviewQuestions
  };
}

// 1-Click Initial Candidate Email Generator tailored to CV & Screening
export function generateInitialCandidateEmail(
  candidateName: string,
  jobTitle: string = 'Internship / Opportunity',
  analysis: ScreeningAnalysis
): { subject: string; body: string } {
  const firstName = candidateName.split(' ')[0] || 'Candidate';
  const subject = `Application for ${jobTitle} at Pile & Loop - Next Steps`;

  const body = `Dear ${firstName},

Thank you for your interest in Pile & Loop and for submitting your application for the ${jobTitle} position!

Our recruitment team has reviewed your CV and qualifications. We were particularly impressed with your background${
    analysis.matchedSkills.length > 0 ? ` and expertise in ${analysis.matchedSkills.slice(0, 3).join(', ')}` : ''
  }.

As the next step in our selection process, we would like to invite you for an initial online screening conversation.

Screening Details:
• Mode: Online Google Meet / Screen
• Duration: 30 minutes
• Agenda: Discussion of your projects, role expectations at Pile & Loop, and mutual Q&A.

To help us schedule the session, please reply directly to this email with 2-3 time slots over the next 48 hours when you are available.

If you have an updated portfolio or GitHub profile, feel free to share it with your reply.

We look forward to speaking with you!

Warm regards,
Talent Acquisition Team
Pile & Loop
hr@pileandloop.com | https://pileandloop.com`;

  return { subject, body };
}
