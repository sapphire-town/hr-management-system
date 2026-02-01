export interface DriveRole {
  name: string;
  description?: string;
  requirements?: string;
  positions?: number;
}

export const interviewerAssignedTemplate = (
  interviewerName: string,
  collegeName: string,
  driveDate: string,
  roles: DriveRole[],
  studentCount: number,
  frontendUrl: string,
  driveId: string
) => ({
  subject: `You've been assigned as interviewer for ${collegeName} Placement Drive`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">New Interviewer Assignment</h2>
      <p>Hello ${interviewerName},</p>
      <p>You have been assigned as an interviewer for the upcoming placement drive:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>College:</strong> ${collegeName}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${driveDate}</p>
        <p style="margin: 8px 0;"><strong>Roles:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${roles.map(role => `<li>${role.name}${role.positions ? ` (${role.positions} positions)` : ''}</li>`).join('')}
        </ul>
        <p style="margin: 8px 0;"><strong>Total Students:</strong> ${studentCount}</p>
      </div>
      <p>Please log in to the HR system to view student details and manage evaluations.</p>
      <a href="${frontendUrl}/dashboard/my-drives?driveId=${driveId}"
         style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        View Drive Details
      </a>
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Best of luck with the interviews!
      </p>
    </div>
  `,
  text: `Hello ${interviewerName},\n\nYou have been assigned as interviewer for ${collegeName} placement drive on ${driveDate}.\n\nRoles: ${roles.map(r => r.name).join(', ')}\nTotal students: ${studentCount}\n\nView details at: ${frontendUrl}/dashboard/my-drives?driveId=${driveId}`
});

export const studentAddedTemplate = (
  interviewerName: string,
  collegeName: string,
  driveDate: string,
  studentCount: number,
  addedCount: number,
  frontendUrl: string,
  driveId: string
) => ({
  subject: `${addedCount} New Student(s) Added to ${collegeName} Drive`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Students Added to Placement Drive</h2>
      <p>Hello ${interviewerName},</p>
      <p><strong>${addedCount}</strong> new student(s) have been added to the placement drive you're assigned to:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>College:</strong> ${collegeName}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${driveDate}</p>
        <p style="margin: 8px 0;"><strong>Total Students:</strong> ${studentCount} (including new additions)</p>
      </div>
      <p>You can now view and evaluate the new students in the system.</p>
      <a href="${frontendUrl}/dashboard/my-drives?driveId=${driveId}"
         style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        View Students
      </a>
    </div>
  `,
  text: `Hello ${interviewerName},\n\n${addedCount} new student(s) have been added to ${collegeName} placement drive on ${driveDate}.\n\nTotal students: ${studentCount}\n\nView students at: ${frontendUrl}/dashboard/my-drives?driveId=${driveId}`
});

export const driveUpdatedTemplate = (
  interviewerName: string,
  collegeName: string,
  changes: Array<{ field: string; oldValue: any; newValue: any }>,
  frontendUrl: string,
  driveId: string
) => {
  const formatValue = (value: any): string => {
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  };

  return {
    subject: `Placement Drive Updated: ${collegeName}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">Placement Drive Details Updated</h2>
      <p>Hello ${interviewerName},</p>
      <p>The placement drive for <strong>${collegeName}</strong> has been updated. The following changes were made:</p>
      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        ${changes.map(change => `
          <div style="margin-bottom: 16px;">
            <p style="margin: 4px 0; color: #7c3aed; font-weight: 600;">${change.field}</p>
            <p style="margin: 4px 0; font-size: 14px;">
              <span style="color: #dc2626; text-decoration: line-through;">${formatValue(change.oldValue)}</span>
              →
              <span style="color: #047857; font-weight: 600;">${formatValue(change.newValue)}</span>
            </p>
          </div>
        `).join('')}
      </div>
      <p>Please review the updated details before the placement drive.</p>
      <a href="${frontendUrl}/dashboard/my-drives?driveId=${driveId}"
         style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        View Updated Drive
      </a>
    </div>
  `,
    text: `Hello ${interviewerName},\n\nThe placement drive for ${collegeName} has been updated:\n\n${changes.map(c => `${c.field}: ${formatValue(c.oldValue)} → ${formatValue(c.newValue)}`).join('\n')}\n\nView details at: ${frontendUrl}/dashboard/my-drives?driveId=${driveId}`
  };
};

export const driveReminderTemplate = (
  interviewerName: string,
  collegeName: string,
  driveDate: string,
  roles: DriveRole[],
  studentCount: number,
  frontendUrl: string,
  driveId: string
) => ({
  subject: `Reminder: Placement Drive Tomorrow at ${collegeName}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #7c3aed;">🔔 Placement Drive Reminder</h2>
      <p>Hello ${interviewerName},</p>
      <p>This is a reminder that you have a placement drive <strong>tomorrow</strong>:</p>
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
        <p style="margin: 8px 0;"><strong>College:</strong> ${collegeName}</p>
        <p style="margin: 8px 0;"><strong>Date:</strong> ${driveDate}</p>
        <p style="margin: 8px 0;"><strong>Roles:</strong></p>
        <ul style="margin: 8px 0; padding-left: 20px;">
          ${roles.map(role => `<li>${role.name}${role.positions ? ` (${role.positions} positions)` : ''}</li>`).join('')}
        </ul>
        <p style="margin: 8px 0;"><strong>Total Students:</strong> ${studentCount}</p>
      </div>
      <p>Please ensure you're prepared and have reviewed the student profiles.</p>
      <a href="${frontendUrl}/dashboard/my-drives?driveId=${driveId}"
         style="background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px;">
        Review Student Profiles
      </a>
      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Good luck with tomorrow's interviews!
      </p>
    </div>
  `,
  text: `Hello ${interviewerName},\n\nReminder: You have a placement drive TOMORROW at ${collegeName} on ${driveDate}.\n\nRoles: ${roles.map(r => r.name).join(', ')}\nTotal students: ${studentCount}\n\nReview student profiles at: ${frontendUrl}/dashboard/my-drives?driveId=${driveId}\n\nGood luck!`
});
