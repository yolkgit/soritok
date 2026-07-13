import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
    rating: number; // 1 to 5
    maxRating?: number;
    className?: string;
    starClassName?: string;
}

export function StarRating({
    rating,
    maxRating = 5,
    className,
    starClassName,
}: StarRatingProps) {
    // Ensure rating is within bounds
    const safeRating = Math.max(0, Math.min(rating, maxRating));

    return (
        <div className={cn("flex items-center gap-0.5", className)}>
            {Array.from({ length: maxRating }).map((_, i) => (
                <Star
                    key={i}
                    className={cn(
                        "w-4 h-4 transition-colors",
                        i < safeRating
                            ? "fill-yellow-400 text-yellow-500" // Filled star
                            : "fill-transparent text-gray-300 dark:text-gray-600", // Empty star
                        starClassName
                    )}
                />
            ))}
        </div>
    );
}
