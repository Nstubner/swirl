import ProfileForm from '@/components/ProfileForm';

// After the last step the profile is marked onboarded and the router moves to the tabs on its own.
export default function Onboarding() {
  return <ProfileForm mode="onboarding" />;
}
