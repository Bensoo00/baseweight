import { Shell } from "@/components/Shell";
import { AddGearForm } from "@/components/AddGearForm";

export default function AddGearPage() {
  return (
    <Shell active="/pack/add">
      <div className="flex-1 px-5 py-6 md:px-8 md:py-8">
        <AddGearForm />
      </div>
    </Shell>
  );
}
