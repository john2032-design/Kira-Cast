import { redirect } from 'next/navigation';

export default function StreamHealthRedirectPage() {
  redirect('/internal/history');
}
