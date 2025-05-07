import { FC } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export type StepStatus = "active" | "upcoming" | "completed";

export interface Step {
  step: number;
  label: string;
  status: StepStatus;
}

interface BookingStatusStepsProps {
  steps: Step[];
  className?: string;
}

const BookingStatusSteps: FC<BookingStatusStepsProps> = ({ steps, className }) => {
  const getStepClass = (status: StepStatus) => {
    switch(status) {
      case "active":
        return "bg-primary text-white";
      case "completed":
        return "bg-green-600 text-white";
      case "upcoming":
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  const getStepLabelClass = (status: StepStatus) => {
    switch(status) {
      case "active":
        return "text-primary font-medium";
      case "completed":
        return "text-primary font-medium";
      case "upcoming":
      default:
        return "text-gray-500";
    }
  };

  return (
    <div className={cn("flex flex-wrap justify-between mb-8", className)}>
      {steps.map((step, index) => (
        <div key={step.step} className="flex flex-col items-center">
          <div 
            className={cn(
              "w-10 h-10 rounded-full mb-2 flex items-center justify-center text-lg font-bold",
              getStepClass(step.status)
            )}
          >
            {step.status === "completed" ? <Check className="h-5 w-5" /> : step.step}
          </div>
          <span className={cn("text-sm", getStepLabelClass(step.status))}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default BookingStatusSteps;
