# doScroll — Execution Plan

## Overview

This plan takes doScroll from the current working prototype to a deployed web app that friends can test. Total estimated time: 1 weekend (10–14 hours of focused work). The plan assumes basic familiarity with React and command-line tools. No prior experience with Supabase or Vercel is required.

---

## Phase 1: Accounts & Keys (30 minutes)

**Goal:** Get all third-party accounts and API keys ready before touching any code.

| Step | Action | Time |
|------|--------|------|
| 1.1 | Create a GitHub account (if needed) and a new repository called `doscroll` | 5 min |
| 1.2 | Create a Supabase account at supabase.com. Start a new project (free tier). Pick a region close to you. Save the database password somewhere safe. | 5 min |
| 1.3 | While Supabase provisions (takes ~2 min), create a Vercel account at vercel.com. Connect it to your GitHub account. | 5 min |
| 1.4 | Get your Supabase keys: go to Settings > API. Copy the **Project URL** and **anon public key**. | 2 min |
| 1.5 | Create an Anthropic account at console.anthropic.com. Add $5 in credits (this will process ~500+ links). Generate an API key. | 10 min |
| 1.6 | Optional: Set up Google OAuth for social sign-in. Go to Google Cloud Console > APIs & Credentials > Create OAuth 2.0 Client ID. Add `https://YOUR-PROJECT.supabase.co/auth/v1/callback` as redirect URI. Enter the client ID and secret in Supabase > Authentication > Providers > Google. | 10 min |

**Checkpoint:** You should have 3 keys written down — Supabase URL, Supabase anon key, Anthropic API key.

---

## Phase 2: Database Setup (15 minutes)

**Goal:** Create the database tables and security policies.

| Step | Action | Time |
|------|--------|------|
| 2.1 | In Supabase dashboard, go to SQL Editor > New Query | 1 min |
| 2.2 | Open `supabase/migration.sql` from the project zip. Copy the entire contents and paste into the SQL editor. | 2 min |
| 2.3 | Click Run. You should see "Success. No rows returned." This creates the `posts` and `user_categories` tables with row-level security. | 1 min |
| 2.4 | Verify: go to Table Editor in the sidebar. You should see both tables listed with their columns. | 2 min |
| 2.5 | In Authentication > Settings, make sure "Enable email confirmations" is toggled to your preference. For testing, turning it off makes sign-up faster. | 2 min |

**Checkpoint:** Two tables visible in Supabase Table Editor, RLS policies active.

---

## Phase 3: Local Development (1 hour)

**Goal:** Get the app running on your machine.

| Step | Action | Time |
|------|--------|------|
| 3.1 | Unzip `doscroll-project.zip` to a folder. Open a terminal in that folder. | 2 min |
| 3.2 | Run `npm install` to install dependencies. | 2 min |
| 3.3 | Copy `.env.example` to `.env`. Fill in your 3 keys. | 3 min |
| 3.4 | Install Vercel CLI globally: `npm install -g vercel` | 2 min |
| 3.5 | Run `vercel dev`. This starts both the React frontend and the serverless function locally. It will ask you to link to a Vercel project — create a new one. | 5 min |
| 3.6 | Open `http://localhost:3000` in your browser. You should see the auth screen. | 1 min |
| 3.7 | Sign up with an email/password. You should land on an empty feed. | 2 min |
| 3.8 | Go to the Add tab. Paste a real URL (e.g. a YouTube video or article). Submit. Wait for AI processing. Verify the post appears with a real title, summary, and OG image. | 5 min |
| 3.9 | Test: star a post, add a note, swipe to delete, swipe to hide, archive with the Done button, check the Archive tab, try Search, try Export CSV, rename a category in Settings. | 15 min |
| 3.10 | Fix any issues. The most common problems at this stage are: wrong env variable names (check for typos), Supabase RLS blocking requests (check policies were created), or the serverless function timing out (check your Anthropic key has credits). | 15 min |

**Checkpoint:** App runs locally. You can sign up, add links with AI processing, and all features work.

---

## Phase 4: Deploy (30 minutes)

**Goal:** Get the app live on the internet with a public URL.

| Step | Action | Time |
|------|--------|------|
| 4.1 | Initialize git and push to GitHub: `git init && git add . && git commit -m "initial" && git remote add origin YOUR_REPO_URL && git push -u origin main` | 5 min |
| 4.2 | Go to vercel.com/new. Import your GitHub repository. | 3 min |
| 4.3 | In the Vercel project settings, go to Environment Variables. Add all three: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`. | 5 min |
| 4.4 | Trigger a redeploy (Settings > Deployments > Redeploy, or just push a commit). | 3 min |
| 4.5 | Wait for build to complete. Vercel gives you a URL like `doscroll-abc123.vercel.app`. | 2 min |
| 4.6 | Optional: Add a custom domain in Vercel project settings if you have one. | 5 min |
| 4.7 | Open the deployed URL. Sign up with a fresh account. Add a link. Verify AI processing and OG images work in production. | 5 min |
| 4.8 | Test on your phone. Open the URL in Safari/Chrome. Add to Home Screen. Verify it launches fullscreen as a PWA. | 5 min |

**Checkpoint:** App is live. You can access it from any device. PWA works on your phone.

---

## Phase 5: Testing with Friends (1–2 hours)

**Goal:** Get 5–10 people using the app and collect feedback.

| Step | Action | Time |
|------|--------|------|
| 5.1 | Send the URL to 5–10 friends. Include a one-line pitch: "It's like a social media feed but only stuff you want to consume. Paste any link and AI turns it into a card." | 10 min |
| 5.2 | Ask each tester to: sign up, add at least 3 links, use the app for 2–3 days, then give you feedback. | Ongoing |
| 5.3 | Specific questions to ask testers: Does the AI generate good titles/summaries? Is the feed format more engaging than a list? What's missing? What's confusing? Do you actually come back to it? | — |
| 5.4 | Monitor Supabase dashboard for errors. Check Vercel function logs for failed AI processing calls. | Ongoing |
| 5.5 | Collect feedback in a shared doc or spreadsheet. Group by: bugs, UX friction, feature requests, and positive signals. | 30 min |

**Checkpoint:** Multiple people are using the app. You have concrete feedback on what works and what doesn't.

---

## Phase 6: Iterate (Ongoing)

**Goal:** Fix what's broken, ship what's requested.

Prioritize based on tester feedback. Likely first fixes:

| Priority | Likely Issue | Fix |
|----------|-------------|-----|
| High | OG images fail for some sites (CORS, hotlink protection) | Add image proxy serverless function, or cache images in Supabase Storage |
| High | AI categorization picks wrong category | Improve the Claude prompt with examples; give it the URL content, not just search results |
| Medium | No way to edit a post after creation | Add edit modal accessible from 3-dot menu |
| Medium | Want to reorder categories | Add drag-to-reorder in Settings |
| Low | Want folders or sub-categories | Evaluate if this adds real value or just complexity |

---

## Budget Summary

| Item | Cost for MVP Testing |
|------|---------------------|
| Supabase | $0 (free tier) |
| Vercel | $0 (free tier) |
| Anthropic API credits | $5 (covers ~500+ links) |
| Domain (optional) | $10–15/year |
| **Total** | **$5–20** |

---

## Timeline at a Glance

| Day | What Happens |
|-----|-------------|
| Saturday morning | Phase 1 + 2: Accounts, keys, database (45 min) |
| Saturday afternoon | Phase 3: Local dev and testing (1 hour) |
| Saturday evening | Phase 4: Deploy to production (30 min) |
| Sunday | Phase 5: Share with friends, watch for issues |
| Following week | Phase 6: Collect feedback, iterate |

---

## Files You Have

| File | What It Is |
|------|-----------|
| `doscroll-project.zip` | Complete deployable project (React + Vite + Supabase + Vercel serverless) |
| `doScroll-PRD.docx` | Product Requirements Document |
| `doscroll.jsx` | Working prototype (Claude artifact version with all features) |
| `plan.md` | This file |
