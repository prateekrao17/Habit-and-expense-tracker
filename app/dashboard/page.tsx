import { redirect } from 'next/navigation'

// The personal dashboard lives at "/" (overview cards, habits, expenses, notes).
// This older route used a different data model (habits_series) and auth user
// IDs that do not match app records, so it now forwards to the real dashboard.
export default function DashboardRedirect() {
  redirect('/')
}
