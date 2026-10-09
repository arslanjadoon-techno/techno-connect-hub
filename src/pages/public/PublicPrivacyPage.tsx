import PublicLayout from "@/components/public/PublicLayout";
import PrivacyPolicyContent from "@/components/public/PrivacyPolicyContent";

export default function PublicPrivacyPage() {
  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto">
        <PrivacyPolicyContent />
      </div>
    </PublicLayout>
  );
}
