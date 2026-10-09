import { router } from 'expo-router';
import ProfileForm from '@/components/ProfileForm';

export default function EditProfile() {
  return <ProfileForm mode="edit" onDone={() => router.back()} />;
}
