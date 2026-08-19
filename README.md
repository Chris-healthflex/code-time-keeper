# Code Time Keeper

**Complete Prompt – Ready to copy-paste**

---

Build a secure, production-ready **Timed Coding Assignment Platform** for Stance Health with the following exact requirements:

### Core Purpose

A system where admins invite candidates by email to a timed take-home assignment. The timer starts the moment the candidate opens their unique link. Admin can see start times in real time. When time expires, an automatic email is sent giving the candidate exactly 10 minutes to submit their work to a specific GitHub repository. The system must be fully encrypted and tamper-proof.

### Tech Stack

- Backend: Python + FastAPI

- Database: MongoDB

- Authentication: JWT (signed, short-lived, one-time use links)

- Email: Any transactional email service (Resend / SendGrid / AWS SES – make it configurable)

- Frontend: Clean, modern React + Tailwind (or Next.js)

- Background jobs: For timed emails (use APScheduler, Celery, or FastAPI background tasks)

- GitHub integration: Optional but preferred (GitHub API to verify last push)

### Key Features

#### 1. Admin Side

- Secure admin login

- Create / manage assignments (title, problem statement, duration in hours, target GitHub repo URL)

- Add candidates by email

- System automatically generates a unique encrypted access link for each candidate and emails it

- Real-time dashboard showing:

  - Candidate email

  - Status (Not Started / In Progress / Time Up / Grace Period / Submitted / Expired)

  - Exact start timestamp

  - Time remaining

  - Last activity

- Ability to manually extend time or revoke access

- View submission status (whether they pushed to the assigned GitHub repo)

#### 2. Candidate Experience

- Candidate receives email with a unique link

- When they open the link:

  - Server records `started_at` timestamp (server-side only)

  - Timer starts immediately

  - They see the full problem statement

  - Live countdown timer (server-synced)

- They work offline / on their own machine

- When main timer reaches zero → automatic email is sent:

  > “Your time is up. You have exactly **10 minutes** to push your final code to the GitHub repository: [repo-url]. After 10 minutes the submission window will close permanently.”

- After the 10-minute grace period the access link becomes invalid

#### 3. Security & Anti-Tampering (Critical)

- All access links must be signed JWTs containing candidate email + assignment ID + expiry

- Timer is **100% server-side** — client cannot manipulate it

- Links are single-use / one-time start (or bound to first open)

- HTTPS only

- Rate limiting on all endpoints

- Full audit log of every access, start, and email sent

- No sensitive data stored in localStorage or client-side

- CORS locked down

- Input validation + protection against common attacks

#### 4. Emails (Automatic)

1. Invitation email with unique link

2. Confirmation when they start

3. “Time is up – 10 minutes remaining to submit” email (triggered exactly when timer ends)

4. Optional final “Submission window closed” email

#### 5. Database Models (MongoDB)

- Admins

- Assignments (title, problem_statement, duration_hours, github_repo, created_at)

- Candidates / Invitations (email, assignment_id, unique_token, started_at, status, grace_ends_at)

- AuditLogs

### UI Requirements

- Extremely clean, modern, minimal design (white background, excellent typography)

- Admin dashboard should feel professional and fast

- Candidate page should show:

  - Clear problem statement

  - Large, accurate countdown timer

  - GitHub repo link

  - Instructions for submission

### Deliverables

- Fully working FastAPI backend

- Clean React frontend

- MongoDB schemas

- Email service integration

- Background job for timed emails

- Admin and Candidate flows completely working

- Environment variable configuration

- Basic README with setup instructions

Make the system production-grade, secure, and ready for real candidates. Prioritize correctness of the timer logic and email triggers above everything else.


see i have attached an image on how the ui must be make it with the exact theme

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0717bc96-79ba-47ec-8834-b62562783967).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
