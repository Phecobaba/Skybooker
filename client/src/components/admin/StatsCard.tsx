import { ReactNode } from "react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  linkText?: string;
  linkUrl?: string;
  color?: "primary" | "green" | "yellow" | "red";
}

export default function StatsCard({
  title,
  value,
  icon,
  linkText,
  linkUrl,
  color = "primary",
}: StatsCardProps) {
  const colorClasses = {
    primary: "bg-primary-100 text-primary",
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };

  const linkTextColorClasses = {
    primary: "text-primary hover:text-primary/90",
    green: "text-green-800 hover:text-green-700",
    yellow: "text-yellow-800 hover:text-yellow-700",
    red: "text-red-800 hover:text-red-700",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center">
          <div
            className={cn(
              "flex-shrink-0 rounded-md p-3",
              colorClasses[color]
            )}
          >
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </CardContent>
      {linkText && linkUrl && (
        <div className="bg-gray-50 px-5 py-3">
          <div className="text-sm">
            <Link href={linkUrl}>
              <a className={cn("font-medium", linkTextColorClasses[color])}>
                {linkText}
              </a>
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
